/* eslint-disable no-new,no-new-wrappers */
// noinspection JSPrimitiveTypeWrapperUsage

const forEach = require("lodash.foreach");
const sinon = require("sinon");
const Injectable = require("./Injectable");
const InjectableType = require("./InjectableType");
const Scope = require("./Scope");
const ModuleFactory = require("./Provider");

describe("injectable", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("will fail if the constructor function with args does not have a $meta property", () => {
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

    MyWrongMetaClass.$meta = {
      injectedParams: ["OneThing", "OtherThing"],
      numberOfUserSuppliedArgs: 0
    };

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

    MyRightMetaClass.$meta = {
      injectedParams: ["OneThing"],
      numberOfUserSuppliedArgs: 2
    };

    const injectable = new Injectable(MyRightMetaClass, "MyRightMetaClass");
    expect(injectable).not.toBeNull();
  });

  it("will not fail if the constructor function without args does not have a $meta property", () => {
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

  it("[constructor] will create a new MODULE_FACTORY, PROTOTYPE if subject is instanceof Provider", () => {
    // GIVEN a module factory
    const moduleFactory = new ModuleFactory(["dependency1", "dependency2"], 3);

      // WHEN I call constructor
      const injectable = new Injectable(moduleFactory, "myModuleFactory");

    // THEN injectable is populated as expected
    expect(injectable.name).toEqual("myModuleFactory");
    expect(injectable.type).toEqual(InjectableType.MODULE_FACTORY);
    expect(injectable.scope).toEqual(Scope.PROTOTYPE);
    expect(moduleFactory.dependencies).toEqual(injectable.injectedParams);
    expect(moduleFactory === injectable.subject).toBe(true);
  });

  it("will create a new instance of an INJECTED_CONSTRUCTOR with parameters", () => {
    function MyTestClass(param1, param2) {
      this.x = param1;
      this.y = param2;
    }

    MyTestClass.$meta = {
      injectedParams: ["param1", "param2"],
      numberOfUserSuppliedArgs: 0,
      scope: Scope.SINGLETON
    };

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

      MyTestClass.$meta = {
        scope: aScope,
        numberOfUserSuppliedArgs: 0
      };

      const injectable = new Injectable(MyTestClass, "mytestclass");

      expect(injectable.eagerInstantiation).toBe(false);
    });
  });

  it("[constructor] will set eagerInstantiation to true when $meta has eager==true for INJECTED_CONSTRUCTOR, PROTOTYPE", () => {
    function MyTestClass() {
    }

    MyTestClass.$meta = {
      scope: Scope.SINGLETON,
      numberOfUserSuppliedArgs: 0,
      eager: true
    };

    const injectable = new Injectable(MyTestClass, "mytestclass");

    expect(injectable.eagerInstantiation).toBe(true);
  });

  class MyModuleFactory extends ModuleFactory {
  }

  it("[newInstance] will create a new instance by way of the factory function for MODULE_FACTORY", () => {
    Object.defineProperty(MyModuleFactory.prototype, "__createInstance", {
      value () {
        return { aField: "hi there" };
      },
      enumerable: false,
      writable: true
    });

    const factoryInjectable = new Injectable(new MyModuleFactory([], 0), "myModuleFactory");

      const instance = factoryInjectable.newInstance([], []);

    expect(instance.aField).toEqual("hi there");
  });

  it("[newInstance] will create a new MODULE_FACTORY instance that requires additionalInjectionParams", () => {
    Object.defineProperty(MyModuleFactory.prototype, "__createInstance", {
      value (injected1, injected2, assisted1, assisted2) {
        return { aField: `hi there ${  injected1  } ${  injected2  } ${  assisted1  } ${  assisted2}` };
      },
      enumerable: false,
      writable: true
    });

    const factoryInjectable = new Injectable(
        new MyModuleFactory([], 2),
        "myModuleFactory");

      const instance = factoryInjectable.newInstance(["injected1", "injected2"], ["assisted1", "assisted2"]);

    expect(instance.aField).toEqual("hi there injected1 injected2 assisted1 assisted2");
  });

  it("[newInstance] will throw an error while creating a new MODULE_FACTORY with wrong number of addl parameters passed", () => {
    Object.defineProperty(MyModuleFactory.prototype, "__createInstance", {
      value (injected1, injected2, assisted1) {
        return { aField: `hi there ${  injected1  } ${  injected2  } ${  assisted1}` };
      },
      enumerable: false,
      writable: true
    });

    const factoryInjectable = new Injectable(
      new MyModuleFactory([], 1),
      "myModuleFactory");

    expect(() => {
      factoryInjectable.newInstance(["injected1", "injected2"], ["assisted1", "invalid_assisted2"]);
    }).toThrow(/expected 1, got 2/);
  });
});
