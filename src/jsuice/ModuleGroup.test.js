/* eslint-disable max-classes-per-file */

const ModuleGroup = require("./ModuleGroup");
const Scope = require("./Scope");
const InjectableType = require("./InjectableType");
const injectableMetadata = require('./injectableMetadata');

class MyTestClass {
  constructor() {
    this.a = "1";
    this.b = "2";
  }
}

class MyGoodMetaClass {
  constructor(inject1, inject2) {
    this.inject1 = inject1;
    this.inject2 = inject2;
  }
}

class MyBusyMetaClass {
  constructor(inject1) {
    this.inject1 = inject1;
  }
}

describe("ModuleGroup", () => {
  let moduleGroup;

  beforeEach(() => {
    moduleGroup = new ModuleGroup("myInjector");
    injectableMetadata.resetAll();

    Object.assign(injectableMetadata.findOrAddMetadataFor(MyGoodMetaClass), {
      injectedParams: ["InjectOne", "InjectTwo"],
      numberOfUserSuppliedArgs: 0
    });

    Object.assign(injectableMetadata.findOrAddMetadataFor(MyBusyMetaClass), {
      injectedParams: ["InjectOne"],
      numberOfUserSuppliedArgs: 0,
      scope: Scope.PROTOTYPE
    });
  });

  it("will allow you to register a constructor function", () => {
    moduleGroup.register("MyTestClass", MyTestClass);

    const injectable = moduleGroup.getInjectable("MyTestClass");
    expect(injectable.type).toEqual(InjectableType.INJECTED_CONSTRUCTOR); // , "when you provide a function to register(), it automatically assigns INJECTED_CONSTRUCTOR to type");
    expect(injectable.scope).toEqual(Scope.PROTOTYPE); // , "Default scope");
    expect(injectable.injectedParams).toEqual([]); // , "Default empty args list") ;
    expect(MyTestClass === injectable.subject).toBe(true); // , "injectable found by name");
  });

  it("will not allow you to register a constructor function under a name that's already taken", () => {
    moduleGroup.register("MyTestClass", MyTestClass);

    expect(() => {
      moduleGroup.register("MyTestClass", MyTestClass);
    }).toThrow(); // , Error, "can't register a name in the moduleGroup more than once");
  });

  it("will succeed when constructor arg and injectedParams list counts match", () => {
    expect(() => {
      moduleGroup.register("MyGoodMetaClass", MyGoodMetaClass);
    }).not.toThrow(); // , "MyGoodMetaClass has equal injectedParams and constructor arg counts");
  });

  it("[register] will create a injectable when I get a successful registration and register it with the group", () => {
    const injectable = moduleGroup.register("MyGoodMetaClass", MyGoodMetaClass);

    expect(injectable === moduleGroup.getInjectable("MyGoodMetaClass")).toBe(true); // , "register returns same object as getInjectable");

    expect(injectable).not.toBeNull();
    expect(injectable.scope).toEqual(Scope.PROTOTYPE); // , "Default is PROTOTYPE when not specified in $meta");
    expect(injectable.injectedParams).toEqual([ "InjectOne", "InjectTwo" ]);
    expect(MyGoodMetaClass === injectable.subject).toBe(true);
    expect(injectable.type).toEqual(InjectableType.INJECTED_CONSTRUCTOR); // , "register makes this type when subject is a function");
  });

  it("will create an injectable with all metadata parsed when I get a successful registration", () => {
    moduleGroup.register("MyBusyMetaClass", MyBusyMetaClass);
    const injectable = moduleGroup.getInjectable("MyBusyMetaClass");

    expect(injectable).not.toBeNull();
    expect(injectable.scope).toEqual(Scope.PROTOTYPE);
    expect(injectable.injectedParams).toEqual([ "InjectOne" ]);
    expect(MyBusyMetaClass === injectable.subject).toBe(true);
    expect(injectable.type).toEqual(InjectableType.INJECTED_CONSTRUCTOR);
  });

  it("will create an injectable for a singleton object if an object is passed to register", () => {
    const anObject = { "abc": 123 };

    moduleGroup.register("anObject", anObject);

    const injectable = moduleGroup.getInjectable("anObject");

    expect(injectable).not.toBeNull();
    expect(injectable.scope).toEqual(Scope.SINGLETON); // , "when you provide an object to register(), it automatically assigns singleton scope");
    expect(injectable.injectedParams).toEqual([]); // , "no injected/constructor params");
    expect(injectable.subject === anObject).toBe(true);
    expect(injectable.type).toEqual(InjectableType.OBJECT_INSTANCE); // , "when you provide an object to register(), it automatically assigns OBJECT_INSTANCE to type");
  });

  it("will throw if the first parameter is not a string", () => {
    expect(() => {
      moduleGroup.register([ "this is an array, not a string" ], {});
    }).toThrow(/Expected first parameter to be a string/);
  });

  it("[getInjectable] will return null when an injectable is not found", () => {
    expect(moduleGroup.getInjectable("not a registered thing")).toBeNull();
  });
});
