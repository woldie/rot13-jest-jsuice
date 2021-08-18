/* eslint-disable no-new,no-new-wrappers,max-classes-per-file */
// noinspection JSPrimitiveTypeWrapperUsage

const forEach = require("lodash.foreach");
const sinon = require("sinon");
const Injectable = require("./Injectable");
const InjectableType = require("./InjectableType");
const Scope = require("./Scope");
const Provider = require("./Provider");
const injectableMetadata = require("./injectableMetadata");
const InjectedParamType = require('./InjectedParamType');

describe("injectable", () => {
  afterEach(() => {
    sinon.restore();
    injectableMetadata.resetAll();
  });

  it("will fail if the constructor function with args does not have associated metadata", () => {
    /**
     * @param {MyTestClass} myTestClass
     * @constructor
     */
    function MyMissingMetaClass(myTestClass) {
      this.c = "3";
      this.d = "4";
      this.myTestClass = myTestClass;
    }

    expect(() => {
      new Injectable(MyMissingMetaClass, "MyMissingMetaClass");
    }).toThrow(); // , Error, "expected a valid $meta object property attached to a constructor function that takes parameters");
  });

  it("will fail if the constructor argument count does not equal length of injectedParams", () => {
    function MyWrongMetaClass(injectMe) {
      this.g = "7";
      this.h = "8";
      this.injectMe = injectMe;
    }

    const metadata = injectableMetadata.findOrAddMetadataFor(MyWrongMetaClass);
    metadata.injectedParams = ["OneThing", "OtherThing"];
    metadata.numberOfUserSuppliedArgs = 0;

    expect(() => {
      new Injectable(MyWrongMetaClass, "MyWrongMetaClass");
    }).toThrow(); // , Error, "MyWrongMetaClass constructor args count does not match the $meta.injectedParams length");
  });

  it("will not fail if the constructor argument count equals length of injectedParams + numberOfUserSuppliedArgs", () => {
    function MyRightMetaClass(injectMe, g, h) {
      this.injectMe = injectMe;
      this.g = g;
      this.h = h;
    }

    const metadata = injectableMetadata.findOrAddMetadataFor(MyRightMetaClass);
    metadata.injectedParams = ["OneThing"];
    metadata.numberOfUserSuppliedArgs = 2;

    const injectable = new Injectable(MyRightMetaClass, "MyRightMetaClass");
    expect(injectable).not.toBeNull();
  });

  it("will not fail if the constructor function without args does not have metadata assigned", () => {
    function MyMetaNotNeededOnNoArgsClass() {
      this.e = "5";
      this.f = "6";
    }

    expect(() => {
      new Injectable(MyMetaNotNeededOnNoArgsClass, "MyMetaNotNeededOnNoArgsClass");
    }).not.toThrow(); // , "MyMetaNotNeededOnNoArgsClass does not have any constructor args, and the registration should be allowed to succeed");
  });

  it("will fail if anything other than object or function is passed to constructor", () => {
    expect(() => {
      new Injectable(12345, "should fail");
    }).toThrow();

    // special case for new'd Strings - should be considered a string, not an 'object'
    expect(() => {
      const injectable = new Injectable(new String("hello world"), "will not fail");

      expect(injectable.type).toEqual(InjectableType.OBJECT_INSTANCE);
    }).toThrow(); // little caveat because javascript is psycho: typeof new String(...) is 'object'
  });

  class MyProvider extends Provider {
  }

  it("[constructor] will create a new PROVIDER, PROTOTYPE if subject is instanceof Provider", () => {
    // GIVEN a Provider
    const provider = new MyProvider(
      ['dependency1', 'dependency2'],
      [ InjectedParamType.INJECTABLE_NAME, InjectedParamType.INJECTABLE_NAME ],
      3);

    // WHEN I call constructor
    const injectable = new Injectable(provider, "myProvider");

    // THEN injectable is populated as expected
    expect(injectable.name).toEqual("myProvider");
    expect(injectable.type).toEqual(InjectableType.PROVIDER);
    expect(injectable.scope).toEqual(Scope.PROTOTYPE);
    expect(provider.dependencies).toEqual(injectable.injectedParams);
    expect(provider === injectable.subject).toBe(true);
  });

  it("will create a new instance of an INJECTED_CONSTRUCTOR with parameters", () => {
    function MyTestClass(param1, param2) {
      this.x = param1;
      this.y = param2;
    }

    const metadata = injectableMetadata.findOrAddMetadataFor(MyTestClass);
    metadata.injectedParams = ["param1", "param2"];
    metadata.numberOfUserSuppliedArgs = 0;
    metadata.scope = Scope.SINGLETON;

    let dynamicObjectFactorySpy = sinon.spy(Injectable.prototype, "createDynamicObjectFactory");
      const injectable = new Injectable(MyTestClass, "MyTestClass");

      const instance = injectable.newInstance(["abc", 123], []);
    expect(dynamicObjectFactorySpy.callCount).toEqual(1); // , "the object factory was created");
    expect(dynamicObjectFactorySpy.returned(injectable.newInstanceFunction)).toBe(true); // , "the instance function was cached");

    expect(instance instanceof MyTestClass).toBe(true); // , "instance was created");
    expect(instance.x).toEqual("abc"); // , "param1 was assigned in the constructor");
    expect(instance.y).toEqual(123); // , "param2 was assigned in the constructor");

    // now try to newInstance again, and the dynamicObjectFactory will be reused rather than re-created
    sinon.restore();
    dynamicObjectFactorySpy = sinon.spy(Injectable.prototype, "createDynamicObjectFactory");
    const anotherInstance = injectable.newInstance(["abc", 123], []);
    expect(dynamicObjectFactorySpy.callCount).toEqual(0); // , "the object factory was not recreated");
    expect(instance !== anotherInstance).toBe(true); // , "newInstance did NOT look at scope (caller is expected to do that).  it *always* creates a new instance when called");
  });

  it("will throw if non-INJECTED_CONSTRUCTOR type has newInstance called", () => {
    const injectable = new Injectable({}, "a singleton object");

    expect(injectable.type).toEqual(InjectableType.OBJECT_INSTANCE); // , "objects are singletons by default");

    expect(() => {
      injectable.newInstance([], []);
    }).toThrow(); // , Error, "Injectable is not instantiable because it is not type INJECTED_CONSTRUCTOR");
  });

  it("[constructor] will set eagerInstantiation to false by default", () => {
    forEach([Scope.SINGLETON, Scope.PROTOTYPE], (aScope) => {
      function MyTestClass() {
      }

      const metadata = injectableMetadata.findOrAddMetadataFor(MyTestClass);
      metadata.scope = aScope;
      metadata.numberOfUserSuppliedArgs = 0;

      const injectable = new Injectable(MyTestClass, "mytestclass");

      expect(injectable.eagerInstantiation).toStrictEqual(false);
    });
  });

  it("[constructor] will set eagerInstantiation to true when metadata has eager==true for INJECTED_CONSTRUCTOR, PROTOTYPE", () => {
    class MyTestClass {
    }

    const metadata = injectableMetadata.findOrAddMetadataFor(MyTestClass);
    metadata.scope = Scope.SINGLETON;
    metadata.numberOfUserSuppliedArgs = 0;
    metadata.eager = true;

    const injectable = new Injectable(MyTestClass, "mytestclass");

    expect(injectable.eagerInstantiation).toStrictEqual(true);
  });

  it("[newInstance] will create a new instance by way of the factory function for PROVIDER", () => {
    const myProvider = new MyProvider([], [], 0);
    injectableMetadata.setProvider(myProvider, () => ({ aField: "hi there" }));

    const factoryInjectable = new Injectable(myProvider, "myProvider");

    const instance = factoryInjectable.newInstance([], []);

    expect(instance.aField).toEqual("hi there");
  });

  it("[newInstance] will create a new PROVIDER instance that requires additionalInjectionParams", () => {
    const myProvider = new MyProvider([], [], 2);
    injectableMetadata.setProvider(myProvider, (injected1, injected2, assisted1, assisted2) => ({
      aField: `hi there ${injected1} ${injected2} ${assisted1} ${assisted2}`
    }));

    const factoryInjectable = new Injectable(myProvider, "myProvider");

    const instance = factoryInjectable.newInstance(
      ["injected1", "injected2"],
      ["assisted1", "assisted2"]
    );

    expect(instance.aField).toEqual("hi there injected1 injected2 assisted1 assisted2");
  });

  function threeParamProviderFunction(injected1, injected2, assisted1) {
    return { aField: `hi there ${injected1} ${injected2} ${assisted1}` };
  }

  it("[newInstance] will throw an error while creating a new PROVIDER with wrong number of addl parameters passed", () => {
    const myProvider = new MyProvider([], [], 1);
    injectableMetadata.setProvider(myProvider, threeParamProviderFunction);

    const factoryInjectable = new Injectable(myProvider, "myProvider");

    expect(() => {
      factoryInjectable.newInstance(["injected1", "injected2"], ["assisted1", "invalid_assisted2"]);
    }).toThrow(/expected 1, got 2/);
  });
});
