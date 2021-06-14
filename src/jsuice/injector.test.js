/* eslint-disable no-bitwise,no-underscore-dangle */
const Scope = require("./Scope");
const InjectableType = require("./InjectableType");
const Injectable = require("./Injectable");
const injector = require('./injector');

// const log = require('../logger')("commons/injector.test");

const { where } = require('../testUtilities/testTools');

describe("injector", () => {
  beforeEach(() => {
    injector.clearScope(Scope.SINGLETON);
    injector.clearScope(Scope.APPLICATION);
    injector.moduleGroups = [];
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
    moduleGroup.register("MyConstructor", MyConstructor);

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

  it("[annotateConstructor] will add non-enumerable, non-writeable $meta to the constructor", () => {
    // GIVEN: a class constructor in a module group
    const moduleGroup = injector.addModuleGroup("myGroup");

    function MyConstructor () {
      this.a = 123;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE);

    moduleGroup.register("myObject", MyConstructor);

    // WHEN: all the properties on MyConstructor are enumerated
    const allProps = Object.keys(MyConstructor);

    // THEN: nothing is enumerable
    expect(allProps.length).toEqual(0); // , "All props length == 0");

    // AND: yet $meta is there
    expect(MyConstructor.$meta).toBeTruthy(); //  "$meta exists");
    expect(Object.prototype.hasOwnProperty.call(MyConstructor, "$meta")).toBe(true);
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

    injector.annotateConstructor(MyConstructorWithInjection, injector.PROTOTYPE_SCOPE, "MyConstructor");

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

    injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE, 3, "other");

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
      injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE, 3, "other");
    }).toThrow(/Expected ctor to have 1 injectables \+ 3 extra parameters, but ctor only has 3 params/);
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
    expect(MyConstructor.$meta).not.toBeNull(); // , "$meta was added to the constructor");
    expect(MyConstructor.$meta.scope).toEqual(Scope.PROTOTYPE); // , , "default prototype scope set");
    expect(MyConstructor.$meta.eager).toBeFalsy(); // , "default eager flag clear");
    expect(MyConstructor.$meta.injectedParams).toEqual(["other"]); // , "injected params set");
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION, annotateConstructor] can handle just ctor", () => {
    // GIVEN injectable constructor function
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    // WHEN I try to annotate the constructor
    injector.annotateConstructor(MyConstructor);

    // THEN ctor has expected metadata annotations
    expect(MyConstructor.$meta).not.toBeNull(); // , "$meta was added to the constructor");
    expect(MyConstructor.$meta.scope).toEqual(Scope.PROTOTYPE); // , "default prototype scope set");
    expect(MyConstructor.$meta.eager).toBeFalsy(); // , "default eager flag clear");
    expect(MyConstructor.$meta.injectedParams).toEqual([]); // , "injected params empty");
  });

  it("[PROTOTYPE, CONSTRUCTOR_FUNCTION] will throw an error if there are any circular dependencies", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

    function MyConstructor (myOtherObject) {
      this.a = myOtherObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE, "MyOtherConstructor");

    moduleGroup.register("MyConstructor", MyConstructor);

    function MyOtherConstructor (otherObject) {
      this.injectedObject = otherObject;
    }
    MyOtherConstructor.prototype.constructor = MyOtherConstructor;

    injector.annotateConstructor(MyOtherConstructor, injector.PROTOTYPE_SCOPE, "MyConstructor");

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

    injector.annotateConstructor(MyConstructor, injector.SINGLETON_SCOPE);

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

  it("[SINGLETON, CONSTRUCTOR_FUNCTION] will not inject dependencies with wider scopes (any other than SINGLETON)", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

    function MyPrototype () {
    }
    MyPrototype.prototype.constructor = MyPrototype;

    injector.annotateConstructor(MyPrototype, injector.PROTOTYPE_SCOPE);

    moduleGroup.register("MyPrototype", MyPrototype);

    function MySingleton (myPrototype) {
      this.x = myPrototype;
    }
    MySingleton.prototype.constructor = MySingleton;

    injector.annotateConstructor(MySingleton, injector.SINGLETON_SCOPE, "MyPrototype");

    moduleGroup.register("MySingleton", MySingleton);

    expect(() => {
      injector.getInstance("MySingleton");
    }).toThrow(/wider scope/); // , "Cannot bind a singleton to a wider-scoped dependency");
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

    injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE, "anObject");

    moduleGroup.register("MyConstructor", MyConstructor);

    const instance = injector.getInstance("MyConstructor");

    expect(anObject === instance.myObject).toBe(true); // , "the OBJECT_INSTANCE singleton got referenced");

    const anotherInstance = injector.getInstance("MyConstructor");

    expect(anObject === anotherInstance.myObject).toBe(true); // (, "the OBJECT_INSTANCE injected really is a singleton");
  });

  it("[newModuleGroup] will simultaneously add a group of injectables to an ModuleGroup -and- add that module to the Injector", () => {
    const anObject = {
      x: 123
    };

    function MyConstructor (myObject) {
      this.myObject = myObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE, "anObject");

    injector.newModuleGroup("myGroup",
      "MyConstructor", MyConstructor,
      "anObject", anObject
    );

    const myConstructedObj = injector.getInstance("MyConstructor");

    expect(myConstructedObj instanceof MyConstructor).toBe(true); // , "constructed prototype is expected instanceof");
    expect(myConstructedObj.myObject).toEqual(anObject); // , "singleton object is same contents");
    expect(anObject === myConstructedObj.myObject).toBe(true); // (, "singleton object is same reference");
  });

  it("[newModuleGroup] will error if your module uses the same name more than once", () => {
    function MyConstructor () {
    }

    function OtherConstructor () {
    }

    expect(() => {
      injector.newModuleGroup("myGroup",
        "MyConstructor", MyConstructor,
        "MyConstructor", OtherConstructor
      );
    }).toThrow(/Module MyConstructor was registered more than once in myGroup module group/);
  });

  it("[newModuleGroup] will error if you try to use the same module group name more than once", () => {
    function MyConstructor () {
    }

    function OtherConstructor () {
    }

    injector.newModuleGroup("myGroup",
      "MyConstructor", MyConstructor
    );

    expect(() => {
      injector.newModuleGroup("myGroup",
        "OtherConstructor", OtherConstructor
      );
    }).toThrow(/ModuleGroup myGroup already exists/);
  });

  it("[newModuleGroup] will error if your module uses the same name more than once across module groups", () => {
    function MyConstructor () {
    }

    function OtherConstructor () {
    }

    injector.newModuleGroup("otherGroup",
      "MyConstructor", MyConstructor
    );

    expect(() => {
      injector.newModuleGroup("myGroup",
        "MyConstructor", OtherConstructor
      );
    }).toThrow(/MyConstructor in module group myGroup was already registered in another module group otherGroup/);
  });

  it("[newModuleGroup] will eager instantate when an eager singleton module is registered in a module group", () => {
    let constructorCalled = false;

    function MyConstructor () {
      constructorCalled = true;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, injector.SINGLETON_SCOPE | injector.EAGER_FLAG);

    injector.newModuleGroup("otherGroup",
      "MyConstructor", MyConstructor
    );

    expect(constructorCalled).toBe(true); // , "The constructor was called for the singleton");
  });

  it("[annotateConstructor] will populate the $meta object with flags and injectedParams", () => {
    function MyConstructor (gazinta, another) {
      this.gazinta = gazinta;
      this.another = another;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, injector.SINGLETON_SCOPE | injector.EAGER_FLAG, "gazinta", "another");

    expect(MyConstructor.$meta).not.toBeNull(); // , "$meta was added to the constructor");
    expect(MyConstructor.$meta.scope).toEqual(Scope.SINGLETON); // , "singleton scope set");
    expect(MyConstructor.$meta.eager).toBe(true); // , "eager flag set");
    expect(MyConstructor.$meta.injectedParams).toEqual(["gazinta", "another"]); // , "injected params set");
  });

  it("[annotateConstructor] will be a prototype scope if no additional parameters are supplied", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor); // no extra parameters applied

    expect(MyConstructor.$meta.scope).toEqual(Scope.PROTOTYPE); // , "prototype scope set");
    expect(MyConstructor.$meta.eager).toBe(false); // , "eager flag unset");
    expect(MyConstructor.$meta.injectedParams).toEqual([]); // , "empty injected params set");
  });

  where((type, nonStringValue) => {
    it(`[annotateConstructor-0] will throw if a non-string appears in injectedParams: ${type}`, () => {
      function MyConstructor (blah) {
        this.blah = blah;
      }
      MyConstructor.prototype.constructor = MyConstructor;

      // EXPECT: injector will throw if any injectedParams contain non-strings
      expect(() => {
        injector.annotateConstructor(MyConstructor, nonStringValue);
      }).toThrow(/Only strings may be passed for injectedParams/); // , "should throw when non-strings appear for injectedParams");
    });

    it(`[annotateConstructor-1] will throw if a non-string appears in injectedParams: ${type}`, () => {
      function MyConstructor (blah, borb) {
        this.blah = blah;
        this.borb = borb;
      }
      MyConstructor.prototype.constructor = MyConstructor;

      // EXPECT: injector will throw if any injectedParams contain non-strings
      expect(() => {
        injector.annotateConstructor(MyConstructor, injector.SINGLETON_SCOPE, "okay1", nonStringValue);
      }).toThrow(/Only strings may be passed for injectedParams/); // , "should throw when non-strings appear for injectedParams");
    });

    it(`[annotateConstructor-2] will throw if a non-string appears in injectedParams: ${type}`, () => {
      function MyConstructor (blah, borb, bwee) {
        this.blah = blah;
        this.borb = borb;
        this.bwee = bwee;
      }
      MyConstructor.prototype.constructor = MyConstructor;

      // EXPECT: injector will throw if any injectedParams contain non-strings
      expect(() => {
        injector.annotateConstructor(MyConstructor, injector.SINGLETON_SCOPE, 0, "okay1", "okay2", nonStringValue);
      }).toThrow(/Only strings may be passed for injectedParams/); // , "should throw when non-strings appear for injectedParams");
    });
  }, [
        {
          type: "regexp",
          nonStringValue: /not a string/
        },
        {
          type: "array",
          nonStringValue: ["string", "string"]
        },
        {
          type: "function",
          nonStringValue: function myFunc () {}
        }
    ]
  );

  it("[annotateConstructor] will fail if a scope is not set or if more than one scope is set", () => {
    [
      0,
      injector.SINGLETON_SCOPE | injector.PROTOTYPE_SCOPE,
      injector.APPLICATION_SCOPE | injector.PROTOTYPE_SCOPE,
      injector.SINGLETON_SCOPE | injector.APPLICATION_SCOPE,
      injector.SINGLETON_SCOPE | injector.APPLICATION_SCOPE | injector.PROTOTYPE_SCOPE
    ].forEach((flags) => {
      function MyConstructor () {
      }
      MyConstructor.prototype.constructor = MyConstructor;

      expect(() => {
        injector.annotateConstructor(MyConstructor, flags);
      }).toThrow(/exactly one scope flag/i); // , "Expect annotateConstructor to throw when flags does not contain exactly one scope");
    });
  });

  it("[annotateConstructor] will allow eager to be set to true only on SINGLETON or APPLICATION", () => {
    [
      injector.SINGLETON_SCOPE,
      injector.APPLICATION_SCOPE
    ].forEach((flags) => {
      function MyConstructor () {
      }
      MyConstructor.prototype.constructor = MyConstructor;

      expect(() => {
        injector.annotateConstructor(MyConstructor, flags | injector.EAGER_FLAG);
      }).not.toThrow(); // , "The annotation with eager flag set should succeed");

      expect(MyConstructor.$meta.eager).toBe(true); // (, "eager flag is set");
    });
  });

  it("[annotateConstructor] will fail if eager flag is set on scopes that do not support eager instantiation", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE | injector.EAGER_FLAG);
    }).toThrow(/Eager flag/); // , "Eager flag is not supported with the PROTOTYPE scope");
  });

  it("[annotateConstructor] will fail if junk flags are detected", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype.constructor = MyConstructor;

    expect(() => {
      injector.annotateConstructor(MyConstructor, injector.APPLICATION_SCOPE | injector.EAGER_FLAG | 4096);
    }).toThrow(/Unknown flags/); // , "Will throw if unknown flags are detected");
  });

  it("[annotateConstructor] will fail if prototype not found on function", () => {
    function MyConstructor () {
    }
    MyConstructor.prototype = null;

    expect(() => {
      injector.annotateConstructor(MyConstructor, 0);
    }).toThrow(/ctor.prototype is null/);
  });

  where((description, badConstructor) => {
    it(`[annotateConstructor] will fail if prototype does not have ctor set on constructor: ${description}`, () => {
      function MyConstructor () {
      }

      MyConstructor.prototype.constructor = badConstructor;

      expect(() => {
        injector.annotateConstructor(MyConstructor, 0);
      }).toThrow(/ctor's prototype requires a 'constructor' property that equates to ctor/);
    });
  }, [
    { description: "null", badConstructor: null },
    { description: "undefined", badConstructor: undefined },
    { description: "A function other than MyConstructor", badConstructor: function NotTHeSameFunction() {} }
  ]);

  it("[createProvider] will incorporate a user-supplied factory callback into a new Provider class", () => {
    // GIVEN a factory function that takes dependencies and returns an object
    const factoryFunction = function (display, printer) {
        return {
          display,
          printer
        };
      };

      // WHEN I call createProvider with the factory function, number of additional parameters, and dep names
      const moduleFactory = injector.createProvider(factoryFunction, 0, "display", "printer");

    // THEN new Provider was built as expected
    expect(moduleFactory.dependencies).toEqual(["display", "printer"]);
    expect(moduleFactory.numberOfUserSuppliedArgs).toEqual(0);

    // AND the Provider's class has the factoryFunction attached to its prototype as '__createInstance'
    const createdObject = moduleFactory.__createInstance("myDisplay", "myPrinter");
    expect(createdObject.display).toEqual("myDisplay");
    expect(createdObject.printer).toEqual("myPrinter");
  });

  it("[PROTOTYPE, MODULE_FACTORY] will have dependencies injected", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

      const anObject = {
        x: 123
      };

    moduleGroup.register("anObject", anObject);

    function MyConstructor (anObject) {
      this.myObject = anObject;
    }
    MyConstructor.prototype.constructor = MyConstructor;

    injector.annotateConstructor(MyConstructor, injector.PROTOTYPE_SCOPE, "anObject");

    moduleGroup.register("myConstructedObject", MyConstructor);

    const moduleFactory = injector.createProvider((myConstructedObject) => ({
        myConstructedObject,
        myObject: myConstructedObject.myObject
      }), 0, "myConstructedObject");

    moduleGroup.register("myFactoryBuiltObject", moduleFactory);

    const instance = injector.getInstance("myFactoryBuiltObject");

    expect(typeof instance.myConstructedObject === "object").toBe(true);
    expect(instance.myObject === anObject).toBe(true);

    const anotherInstance = injector.getInstance("myFactoryBuiltObject");

    expect(instance !== anotherInstance).toBe(true); // (, "factory function was called twice due to prototype scope");
  });

  it("[PROTOTYPE, MODULE_FACTORY] will have dependencies injected with assisted injection from end-user supplied params", () => {
    const moduleGroup = injector.addModuleGroup("myGroup");

      const anObject = {
        x: 123
      };

    moduleGroup.register("anObject", anObject);

    const moduleFactory = injector.createProvider((anObject, extraParam1, extraParam2) => ({
        myObject: anObject,
        extraParam1,
        extraParam2
      }), 2, "anObject");

    moduleGroup.register("myFactoryBuiltObject", moduleFactory);

    const instance = injector.getInstance("myFactoryBuiltObject", "extraParam1", "extraParam2");

    expect(instance.myObject === anObject).toBe(true);
    expect(instance.extraParam1).toEqual("extraParam1");
    expect(instance.extraParam2).toEqual("extraParam2");

    const anotherInstance = injector.getInstance("myFactoryBuiltObject", "extraParam1", "extraParam2");

    expect(instance !== anotherInstance).toBe(true); // , "factory function was called twice due to prototype scope");
  });

  where((scope, type) => {
    it(`[getInstanceForInjectable] will throw if you pass any assistedInjectionParams for ${scope} and ${type}`, () => {
      // GIVEN a dummy injectable with scope and type
      const injectable = new Injectable({});
      injectable.scope = scope;
      injectable.type = type;

      // EXPECT getInstanceForInjectable to throw
      expect(() => {
        injector.getInstanceForInjectable(injectable, [], [], ["assisted injection params not expected here"]);
      }).toThrow(/Assisted injection parameters were passed but are not allowed/);
    });
  }, [
    // WHERE: only PROTOTYPE, MODULE_FACTORY or INJECTED_CONSTRUCTOR supports assisted injection (at this time)
    {
      scope: Scope.PROTOTYPE,
      type: InjectableType.OBJECT_INSTANCE
    },
    {
      scope: Scope.APPLICATION,
      type: InjectableType.INJECTED_CONSTRUCTOR
    },
    {
      scope: Scope.APPLICATION,
      type: InjectableType.OBJECT_INSTANCE
    },
    {
      scope: Scope.APPLICATION,
      type: InjectableType.MODULE_FACTORY
    },
    {
      scope: Scope.SINGLETON,
      type: InjectableType.INJECTED_CONSTRUCTOR
    },
    {
      scope: Scope.SINGLETON,
      type: InjectableType.OBJECT_INSTANCE
    },
    {
      scope: Scope.SINGLETON,
      type: InjectableType.MODULE_FACTORY
    }
  ]);

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
