/* eslint-disable no-bitwise,no-underscore-dangle,no-console,no-unused-vars */
const Scope = require('./Scope');
const Flags = require('./Flags')
const InjectableType = require('./InjectableType');
const Injectable = require('./Injectable');
const Injector = require('./Injector');
const DependencyGraph = require('./dependencies/DependencyGraph');
const injectableMetadata = require('./injectableMetadata');
const InjectedParamType = require('./InjectedParamType');

jest.mock('./dependencies/DependencyGraph');

describe("Injector", () => {
  /** @type {Injector} */
  let injector;

  beforeAll(() => {
    injector = new Injector(new DependencyGraph());
  });

  beforeEach(() => {
    DependencyGraph.mockClear();
    injector.clearScope(Scope.SINGLETON);
    injector.clearScope(Scope.APPLICATION);
    injector.moduleGroups = [];
    injectableMetadata.resetAll();
  });

  it("[addModuleGroup] will register a moduleGroup", () => {
    const moduleGroup = injector.addModuleGroup("myModuleGroup");

    expect(injector.moduleGroups.length).toEqual(1); // , "should have gotten a moduleGroup");
    expect(moduleGroup === injector.moduleGroups[0]).toBe(true); // , "should be the one we added");
  });

  it("[addModuleGroup] will not allow you to register the same module twice", () => {
    injector.addModuleGroup("myModuleGroup");
    injector.addModuleGroup("myModuleGroup");

    expect(injector.moduleGroups.length).toEqual(1); // , "should have only one module in there");
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION] will instantiate successfully", () => {
    function MyConstructor () {
      this.a = 123;
    }

    const moduleGroup = injector.addModuleGroup("myGroup");
    const ctorInjectable = moduleGroup.register("MyConstructor", MyConstructor);

    expect(injector.dependencyGraph.associateInjectableWithModuleGroup).toHaveBeenCalledWith(ctorInjectable, "myGroup");

    const newPrototypeScopeInstance = injector.getInstance("MyConstructor");
    expect(newPrototypeScopeInstance).not.toBeNull();
    expect(newPrototypeScopeInstance instanceof MyConstructor).toBe(true);
    expect(newPrototypeScopeInstance.a).toEqual(123);

    const anotherPrototypeScopeInstance = injector.getInstance("MyConstructor");
    expect(anotherPrototypeScopeInstance).not.toBeNull();

    // AND they are equal but are not the same instance due to prototypal scope
    expect(newPrototypeScopeInstance).toEqual(anotherPrototypeScopeInstance); // valued the same
    expect(newPrototypeScopeInstance !== anotherPrototypeScopeInstance).toBe(true); // different instances
  });

  it("[annotateConstructor] will add metadata for the constructor", () => {
    // GIVEN: a class constructor in a module group
    const moduleGroup = injector.addModuleGroup("myGroup");

    class MyConstructor {
      constructor() {
        this.a = 123;
      }
    }

    injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE);

    moduleGroup.register("myObject", MyConstructor);

    // WHEN: all the properties on MyConstructor are enumerated
    const allProps = Object.keys(MyConstructor);

    // THEN: nothing is enumerable because nothing was added to the constructor
    expect(allProps.length).toEqual(0); // , "All props length == 0");

    // AND: and metadata was added to the constructor
    expect(injectableMetadata.hasMetadataAssigned(MyConstructor));
    expect(injectableMetadata.findOrAddMetadataFor(MyConstructor)).toEqual({
      moduleFilePath: expect.stringMatching(/Injector.test.js$/),
      scope: Scope.PROTOTYPE,
      flags: 0,
      eager: false,
      injectedParams: [],
      injectedParamTypes: [],
      numberOfUserSuppliedArgs: 0,
    });
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION] will instantiate with an injection", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

    function MyConstructor () {
      this.a = 123;
    }

    moduleGroup.register("MyConstructor", MyConstructor);

    function MyConstructorWithInjection (otherObject) {
      this.injectedObject = otherObject;
    }
    MyConstructorWithInjection.prototype.constructor = MyConstructorWithInjection;

    injector.annotateConstructor(MyConstructorWithInjection, Scope.PROTOTYPE, "MyConstructor");

    moduleGroup.register("MyConstructorWithInjection", MyConstructorWithInjection);

    const objectWithInjection = injector.getInstance("MyConstructorWithInjection");

    expect(objectWithInjection instanceof MyConstructorWithInjection).toBe(true); // , "outer object is correct type");
    expect(objectWithInjection.injectedObject instanceof MyConstructor).toBe(true); // , "inner object is correct type");
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION] will allow assisted injection with extra parameters", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

    function Other () {
      this.b = 456;
    }

    moduleGroup.register("other", Other);

    function MyConstructor (other, assisted1, assisted2, assisted3) {
      this.other = other;
      this.assisted1 = assisted1;
      this.assisted2 = assisted2;
      this.assisted3 = assisted3;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE, 3, "other");

    moduleGroup.register("MyConstructor", MyConstructor);

    const assistedInjection = injector.getInstance("MyConstructor", "assistParam1", "assistParam2", "assistParam3");

    expect(assistedInjection instanceof MyConstructor).toBe(true); // , "outer object is correct type");
    expect(assistedInjection.other instanceof Other).toBe(true); // , "inner object dependency is correct type");
    expect(assistedInjection.other.b).toEqual(456); // , "other's value was set");
    expect(assistedInjection.assisted1).toEqual("assistParam1"); // , "assisted parameter 1 came through and was set");
    expect(assistedInjection.assisted2).toEqual("assistParam2"); // , "assisted parameter 2 came through and was set");
    expect(assistedInjection.assisted3).toEqual("assistParam3"); // , "assisted parameter 3 came through and was set");
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION, annotateConstructor] throws if injectable count + extra param count != ctor.length", () => {
    // GIVEN injectable constructor function that references other and has two assisted injection parameters
    function MyConstructor (other, assisted1, assisted2) {
      this.other = other;
      this.assisted1 = assisted1;
      this.assisted2 = assisted2;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    // WHEN I try to annotate the constructor with a wrong number of parameters (1+3 instead of 1+2)
    expect(() => {
      injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE, 3, "other");
    }).toThrow(/ctor named argument counts do not match.*1 injectable arguments \+ 3 user-supplied arguments.*ctor has 3 named arguments/);
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION, annotateConstructor] can handle just ctor and injectables list", () => {
    // GIVEN injectable constructor function
    function MyConstructor (other) {
      this.other = other;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    // WHEN I try to annotate the constructor2)
    injector.annotateConstructor(MyConstructor, "other");

    // THEN ctor has expected metadata annotations
    expect(injectableMetadata.hasMetadataAssigned(MyConstructor)).toStrictEqual(true);
    expect(injectableMetadata.findOrAddMetadataFor(MyConstructor)).toEqual({
      moduleFilePath: expect.stringMatching(/Injector.test.js$/),
      scope: Scope.PROTOTYPE,
      flags: 0,
      eager: false,
      numberOfUserSuppliedArgs: 0,
      injectedParams: ["other"],
      injectedParamTypes: [
        InjectedParamType.INJECTABLE_NAME
      ]
    });
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION, annotateConstructor] can handle just ctor", () => {
    // GIVEN injectable constructor function
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    // WHEN I try to annotate the constructor
    injector.annotateConstructor(MyConstructor);

    // THEN ctor has expected metadata annotations
    expect(injectableMetadata.hasMetadataAssigned(MyConstructor)).toStrictEqual(true);
    expect(injectableMetadata.findOrAddMetadataFor(MyConstructor)).toEqual({
      moduleFilePath: expect.stringMatching(/Injector.test.js$/),
      scope: Scope.PROTOTYPE,
      flags: 0,
      eager: false,
      numberOfUserSuppliedArgs: 0,
      injectedParams: [],
      injectedParamTypes: []
    });
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION] will throw an error if there are any circular dependencies", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

    function MyConstructor (myOtherObject) {
      this.a = myOtherObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE, "MyOtherConstructor");

    moduleGroup.register("MyConstructor", MyConstructor);

    function MyOtherConstructor (otherObject) {
      this.injectedObject = otherObject;
    }
    MyOtherConstructor.prototype.constructor = MyOtherConstructor;

    injector.annotateConstructor(MyOtherConstructor, Scope.PROTOTYPE, "MyConstructor");

    moduleGroup.register("MyOtherConstructor", MyOtherConstructor);

    expect(() => {
      injector.getInstance("MyConstructor");
    }).toThrow(/Circular dependency/); // , "Circular dependencies between Injectables should throw");
  });

  it("[SINGLETON, CONSTRUCTOR_FUNCTION] will instantiate once and only once", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

    function MyConstructor () {
      this.a = 123;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.SINGLETON);

    moduleGroup.register("MyConstructor", MyConstructor);

    const injectable = moduleGroup.getInjectable("MyConstructor");
    expect(injectable.scope).toEqual(Scope.SINGLETON);

    // before the first construction, the non-eager singleton will not have been instantiated and cached in the SINGLETON scope
    expect(Object.prototype.hasOwnProperty.call(injector.scopes[Scope.SINGLETON], "MyConstructor")).toBe(false);
    const objectA = injector.getInstance("MyConstructor");
    expect(Object.prototype.hasOwnProperty.call(injector.scopes[Scope.SINGLETON], "MyConstructor")).toBe(true);

    const objectB = injector.getInstance("MyConstructor");

    expect(objectA === objectB).toBe(true); // , "singleton object should be returned for objectA and objectB");
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION] will not inject dependencies from wider scopes than PROTOTYPE", () => {
    console.log("TODO, need application scope to do this test");
  });

  it("[SINGLETON, OBJECT_INSTANCE] will be injected as a dependency into a CONSTRUCTOR_FUNCTION Injectable", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

      const anObject = {
        x: 123
      };

    moduleGroup.register("anObject", anObject);

    function MyConstructor (myObject) {
      this.myObject = myObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE, "anObject");

    moduleGroup.register("MyConstructor", MyConstructor);

    const instance = injector.getInstance("MyConstructor");

    expect(anObject === instance.myObject).toBe(true); // , "the OBJECT_INSTANCE singleton got referenced");

    const anotherInstance = injector.getInstance("MyConstructor");

    expect(anObject === anotherInstance.myObject).toBe(true); // (, "the OBJECT_INSTANCE injected really is a singleton");
  });

  it("[moduleGroup] will simultaneously add a group of injectables to an ModuleGroup -and- add that module to the Injector", () => {
    const anObject = {
      x: 123
    };

    function MyConstructor (myObject) {
      this.myObject = myObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE, "anObject");

    injector.moduleGroup("myGroup",
      "MyConstructor", MyConstructor,
      "anObject", anObject
    );

    const myConstructedObj = injector.getInstance("MyConstructor");

    expect(myConstructedObj instanceof MyConstructor).toBe(true); // , "constructed prototype is expected instanceof");
    expect(myConstructedObj.myObject).toEqual(anObject); // , "singleton object is same contents");
    expect(anObject === myConstructedObj.myObject).toBe(true); // (, "singleton object is same reference");
  });

  it("[moduleGroup] will error if your module uses the same name more than once", () => {
    function MyConstructor () {
    }

    function OtherConstructor () {
    }

    expect(() => {
      injector.moduleGroup("myGroup",
        "MyConstructor", MyConstructor,
        "MyConstructor", OtherConstructor
      );
    }).toThrow(/Module MyConstructor was registered more than once in myGroup module group/);
  });

  it("[moduleGroup] will error if you try to use the same module group name more than once", () => {
    function MyConstructor () {
    }

    function OtherConstructor () {
    }

    injector.moduleGroup("myGroup",
      "MyConstructor", MyConstructor
    );

    expect(() => {
      injector.moduleGroup("myGroup",
        "OtherConstructor", OtherConstructor
      );
    }).toThrow(/ModuleGroup myGroup already exists/);
  });

  it("[moduleGroup] will error if your module uses the same name more than once across module groups", () => {
    function MyConstructor () {
    }

    function OtherConstructor () {
    }

    injector.moduleGroup("otherGroup",
      "MyConstructor", MyConstructor
    );

    expect(() => {
      injector.moduleGroup("myGroup",
        "MyConstructor", OtherConstructor
      );
    }).toThrow(/MyConstructor in module group myGroup was already registered in another module group otherGroup/);
  });

  it("[moduleGroup] will eager instantate when an eager singleton module is registered in a module group", () => {
    let constructorCalled = false;

    function MyConstructor () {
      constructorCalled = true;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.SINGLETON | Flags.EAGER);

    injector.moduleGroup("otherGroup",
      "MyConstructor", MyConstructor
    );

    expect(constructorCalled).toBe(true); // , "The constructor was called for the singleton");
  });

  it("[annotateConstructor] will populate the metadata with flags and injectedParams", () => {
    function MyConstructor (gazinta, another) {
      this.gazinta = gazinta;
      this.another = another;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.SINGLETON | Flags.EAGER, "gazinta", "another");

    expect(injectableMetadata.hasMetadataAssigned(MyConstructor)).toStrictEqual(true);
    expect(injectableMetadata.findOrAddMetadataFor(MyConstructor)).toEqual({
      moduleFilePath: expect.stringMatching(/Injector.test.js$/),
      scope: Scope.SINGLETON,
      flags: 0,
      eager: true,
      numberOfUserSuppliedArgs: 0,
      injectedParams: ["gazinta", "another"],
      injectedParamTypes: [ InjectedParamType.INJECTABLE_NAME, InjectedParamType.INJECTABLE_NAME ]
    });
  });

  it("[annotateConstructor] will be a prototype scope if no additional parameters are supplied", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor); // no extra parameters applied

    // ctor has expected metadata annotations
    expect(injectableMetadata.hasMetadataAssigned(MyConstructor)).toStrictEqual(true);
    expect(injectableMetadata.findOrAddMetadataFor(MyConstructor)).toEqual({
      moduleFilePath: expect.stringMatching(/Injector.test.js$/),
      scope: Scope.PROTOTYPE,
      flags: 0,
      eager: false,
      numberOfUserSuppliedArgs: 0,
      injectedParams: [],
      injectedParamTypes: []
    });
  });

  test.each`
    type          | nonStringValue
    ${'regexp'}   | ${/not a string/}
    ${'array'}    | ${["string", "string"]}
  ${'function'}   | ${function myFunc () {}}
  `('[annotateConstructor-0] will throw if a non-string appears in injectedParams: $type', ({ type, nonStringValue }) => {
    // GIVEN: a constructor with 1 injected arg
    function MyConstructor (blah) {
      this.blah = blah;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    // EXPECT: injector will throw if any injectedParams contain non-strings
    expect(() => {
      injector.annotateConstructor(MyConstructor, nonStringValue);
    }).toThrow(/only Strings or Instancer functions may be passed for injectedParams/); // , "should throw when non-strings appear for injectedParams");

    // GIVEN: a constructor with 2 injected args
    function MyConstructor2 (blah, borb) {
      this.blah = blah;
      this.borb = borb;
    }
    MyConstructor2.prototype.constructor = MyConstructor2;

    // EXPECT: injector will throw if any injectedParams contain non-strings
    expect(() => {
      injector.annotateConstructor(MyConstructor2, Scope.SINGLETON, "okay1", nonStringValue);
    }).toThrow(/only Strings or Instancer functions may be passed for injectedParams/); // , "should throw when non-strings appear for injectedParams");

    // GIVEN: a constructor with 3 args
    function MyConstructor3 (blah, borb, bwee) {
      this.blah = blah;
      this.borb = borb;
      this.bwee = bwee;
    }
    MyConstructor3.prototype.constructor = MyConstructor3;

    // EXPECT: injector will throw if any injectedParams contain non-strings
    expect(() => {
      injector.annotateConstructor(MyConstructor3, Scope.SINGLETON, 0, "okay1", "okay2", nonStringValue);
    }).toThrow(/only Strings or Instancer functions may be passed for injectedParams/); // , "should throw when non-strings appear for injectedParams");
  });

  test.each`
    flags
    ${Scope.SINGLETON | Scope.PROTOTYPE}
    ${Scope.APPLICATION | Scope.PROTOTYPE}
    ${Scope.SINGLETON | Scope.APPLICATION}
    ${Scope.SINGLETON | Scope.APPLICATION | Scope.PROTOTYPE}
  `('[annotateConstructor] will fail if more than one scope is set: $flags', ({ flags }) => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, flags);
    }).toThrow(/Only one Scope may be supplied in flags/i);
  });

  test.each`
    scopeFlag            | scope
    ${Scope.SINGLETON}   | ${Scope.SINGLETON}
    ${Scope.APPLICATION} | ${Scope.APPLICATION}
  `("[annotateConstructor] will allow eager to be set to true only on SINGLETON or APPLICATION", ({ scopeFlag, scope }) => {
    function MyConstructor () {
    }

    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, scopeFlag | Flags.EAGER);
    }).not.toThrow(); // , "The annotation with eager flag set should succeed");

    // THEN ctor has expected metadata annotations
    expect(injectableMetadata.hasMetadataAssigned(MyConstructor)).toStrictEqual(true);
    expect(injectableMetadata.findOrAddMetadataFor(MyConstructor)).toEqual({
      moduleFilePath: expect.stringMatching(/Injector.test.js$/),
      scope,
      flags: 0,
      eager: true,
      numberOfUserSuppliedArgs: 0,
      injectedParams: [],
      injectedParamTypes: []
    });
  });

  it("[annotateConstructor] will fail if eager flag is set on scopes that do not support eager instantiation", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE | Flags.EAGER);
    }).toThrow(/Eager flag/); // , "Eager flag is not supported with the PROTOTYPE scope");
  });

  it("[annotateConstructor] will fail if junk flags are detected", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, Scope.APPLICATION | Flags.EAGER | 4096);
    }).toThrow(/Unknown flags/); // , "Will throw if unknown flags are detected");
  });

  it('[annotateConstructor] will fail if numOfUserSuppliedArgs is supplied but flags is not', () => {
    function MyConstructor (extraParam1, extraParam2) {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, 2);
    }).toThrow(/flags parameter required; when numOfUserSuppliedArgs \(2\) is supplied, flags is also required/);
  });


  it("[annotateConstructor] will fail if prototype not found on function", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype = null;

    expect(() => {
      injector.annotateConstructor(MyConstructor, 0);
    }).toThrow(/ctor.prototype is null/);
  });

  test.each`
    description                               | badConstructor
    ${'null'}                                 | ${null}
    ${'undefined'}                            | ${undefined}
    ${'A function other than MyConstructor'}  | ${function NotTHeSameFunction() {}}
  `('[annotateConstructor] will fail if prototype does not have ctor set on constructor: $description', ({ description, badConstructor }) => {
    function MyConstructor () {
    }

    MyConstructor.prototype.constructor = badConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, 0);
    }).toThrow(/ctor's prototype requires a 'constructor' property that equates to ctor/);
  });

  it("[createProvider] will incorporate a user-supplied factory callback into a new Provider class", () => {
    // GIVEN a provider function that takes dependencies and returns an object
    const providerFunction = (display, printer) => ({
      display,
      printer,
    });

    // WHEN I call createProvider with the factory function, number of additional parameters, and dep names
    const provider = injector.createProvider(providerFunction, 0, "display", "printer");

    // THEN new Provider was built as expected
    expect(provider.dependencies).toEqual(["display", "printer"]);
    expect(provider.numberOfUserSuppliedArgs).toEqual(0);

    // AND the Provider's class has the providerFunction available via injectableMetadata
    const retrievedProviderFunction = injectableMetadata.getProviderFunction(provider);
    const createdObject = retrievedProviderFunction("myDisplay", "myPrinter");
    expect(createdObject.display).toEqual("myDisplay");
    expect(createdObject.printer).toEqual("myPrinter");
  });

  it("[PROTOTYPE, PROVIDER] will have dependencies injected", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

      const anObject = {
        x: 123
      };

    moduleGroup.register("anObject", anObject);

    function MyConstructor (anObject) {
      this.myObject = anObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, Scope.PROTOTYPE, "anObject");

    moduleGroup.register("myConstructedObject", MyConstructor);

    const provider = injector.createProvider((myConstructedObject) => ({
        myConstructedObject,
        myObject: myConstructedObject.myObject
      }), 0, "myConstructedObject");

    moduleGroup.register("myFactoryBuiltObject", provider);

    const instance = injector.getInstance("myFactoryBuiltObject");

    expect(typeof instance.myConstructedObject === "object").toBe(true);
    expect(instance.myObject === anObject).toBe(true);

    const anotherInstance = injector.getInstance("myFactoryBuiltObject");

    expect(instance !== anotherInstance).toBe(true); // (, "factory function was called twice due to prototype scope");
  });

  it("[PROTOTYPE, PROVIDER] will have dependencies injected with assisted injection from end-user supplied params", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

      const anObject = {
        x: 123
      };

    moduleGroup.register("anObject", anObject);

    const moduleFactory = injector.createProvider((anObject, extraParam1, extraParam2) => ({
        myObject: anObject,
        extraParam1,
        extraParam2
      }), Scope.PROTOTYPE, 2, "anObject");

    moduleGroup.register("myFactoryBuiltObject", moduleFactory);

    const instance = injector.getInstance("myFactoryBuiltObject", "extraParam1", "extraParam2");

    expect(instance.myObject === anObject).toBe(true);
    expect(instance.extraParam1).toEqual("extraParam1");
    expect(instance.extraParam2).toEqual("extraParam2");

    const anotherInstance = injector.getInstance("myFactoryBuiltObject", "extraParam1", "extraParam2");

    expect(instance !== anotherInstance).toBe(true); // , "factory function was called twice due to prototype scope");
  });

  it('[PROTOTYPE, PROVIDER] will throw a special Error message if numOfUserSuppliedArgs is supplied but flags is not', () => {
    expect(() => {
      injector.createProvider((extraParam1, extraParam2) => ({
        extraParam1,
        extraParam2
      }), 2, 'anObject');
    }).toThrow(/flags parameter required; when numOfUserSuppliedArgs \(2\) is supplied, flags is also required/)
  });


  test.each`
    scope                 | type
    ${Scope.PROTOTYPE}    | ${InjectableType.OBJECT_INSTANCE}
    ${Scope.APPLICATION}  | ${InjectableType.INJECTED_CONSTRUCTOR}
    ${Scope.APPLICATION}  | ${InjectableType.OBJECT_INSTANCE}
    ${Scope.APPLICATION}  | ${InjectableType.PROVIDER}
    ${Scope.SINGLETON}    | ${InjectableType.INJECTED_CONSTRUCTOR}
    ${Scope.SINGLETON}    | ${InjectableType.OBJECT_INSTANCE}
    ${Scope.SINGLETON}    | ${InjectableType.PROVIDER}
  `("[getInstanceForInjectable] will throw if you pass any assistedInjectionParams for $scope and $type", ({ scope, type }) => {
    // GIVEN a dummy injectable with scope and type
    const injectable = new Injectable({});
    injectable.scope = scope;
    injectable.type = type;

    // EXPECT getInstanceForInjectable to throw
    expect(() => {
      injector.getInstanceForInjectable(injectable, [], [], ["assisted injection params not expected here"]);
    }).toThrow(/Assisted injection parameters were passed but are not allowed/);
  });

  it("[getModuleGroupInstances] will fail if there is an attempt to pass assisted injection parameters", () => {
    expect(() => {
      injector.getModuleGroupInstances("moduleGroupName", "you can't pass addl parameters, this will fail");
    }).toThrow(/getModuleGroupInstances does not currently support assisted injection to its injectables/);
  });

  it("[getModuleGroupInstances] will fail there is no module group registered with passed name", () => {
    expect(() => {
      injector.getModuleGroupInstances("thisModuleGroupDoesntExist");
    }).toThrow(/ModuleGroup thisModuleGroupDoesntExist not found/);
  });
});
