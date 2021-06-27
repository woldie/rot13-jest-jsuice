/* eslint-disable max-classes-per-file,max-len */
// noinspection JSCheckFunctionSignatures

const ModuleGroup = require('./ModuleGroup');
const { PROTOTYPE, SINGLETON } = require('./Scope');
const { INJECTED_CONSTRUCTOR, OBJECT_INSTANCE } = require('./InjectableType');
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

describe('ModuleGroup', () => {
  /**
   * @type {DependencyGraph}
   */
  let dependencyGraph;

  /**
   * @type {ModuleGroup}
   */
  let moduleGroup;

  beforeEach(() => {
    dependencyGraph = /** @type {DependencyGraph} */ {
      registerSubject: jest.fn(),
      associateInjectableWithModuleGroup: jest.fn(),
      associateConstructionParameterWithInjectable: jest.fn()
    };
    moduleGroup = new ModuleGroup('myModuleGroup', dependencyGraph, injectableMetadata);
    injectableMetadata.resetAll();

    Object.assign(injectableMetadata.findOrAddMetadataFor(MyGoodMetaClass), {
      injectedParams: ['InjectOne', 'InjectTwo'],
      numberOfUserSuppliedArgs: 0
    });

    Object.assign(injectableMetadata.findOrAddMetadataFor(MyBusyMetaClass), {
      injectedParams: ['InjectOne'],
      numberOfUserSuppliedArgs: 0,
      scope: PROTOTYPE
    });
  });

  test.each`
    injectableName        | subject             | scope           | injectableType           | injectedParamNames
    ${'MyTestClass'}      | ${MyTestClass}      | ${PROTOTYPE}    | ${INJECTED_CONSTRUCTOR}  | ${[]}
    ${'MyGoodMetaClass'}  | ${MyGoodMetaClass}  | ${PROTOTYPE}    | ${INJECTED_CONSTRUCTOR}  | ${[
                                                                                                   'InjectOne',
                                                                                                   'InjectTwo'
                                                                                                 ]}
    ${'MyBusyMetaClass'}  | ${MyBusyMetaClass}  | ${PROTOTYPE}    | ${INJECTED_CONSTRUCTOR}  | ${[ 'InjectOne' ]}
    ${'anObject'}         | ${{ "abc": 123 }}   | ${SINGLETON}    | ${OBJECT_INSTANCE}       | ${[]}
  `('will succeed when subject and injectedParams list counts match: $injectableName', ({
      injectableName,
      subject,
      scope,
      injectableType,
      injectedParamNames }) => {

    // WHEN: I register a class with the module group
    const classInjectable = moduleGroup.register(injectableName, subject);

    // THEN: I can retrieve the injectable back from the moduleGroup
    expect(moduleGroup.getInjectable(injectableName)).toStrictEqual(classInjectable);

    // AND: the injectable will be populated with the expected fields
    expect(classInjectable).not.toBeNull();
    expect(classInjectable.scope).toEqual(scope);
    expect(classInjectable.injectedParams).toEqual(injectedParamNames);
    expect(classInjectable.subject).toStrictEqual(subject);
    expect(classInjectable.type).toEqual(injectableType);

    // AND: the class should have been associated with the moduleGroup in the dependency graph
    expect(dependencyGraph.associateInjectableWithModuleGroup)
      .toHaveBeenCalledWith(classInjectable, 'myModuleGroup')

    // AND: its constructor parameters should have been associated with the dependency graph
    expect(dependencyGraph.associateConstructionParameterWithInjectable)
      .toHaveBeenCalledTimes(injectedParamNames.length);
    injectedParamNames.forEach((paramName) => {
      expect(dependencyGraph.associateConstructionParameterWithInjectable)
      .toHaveBeenCalledWith(paramName, classInjectable)
    });
  });

  it('will not allow you to register a constructor function under a name thats already taken', () => {
    moduleGroup.register('MyTestClass', MyTestClass);

    expect(() => {
      moduleGroup.register('MyTestClass', MyTestClass);
    }).toThrow(/already registered in module group/);
  });

  it('will throw if the first parameter is not a string', () => {
    expect(() => {
      moduleGroup.register([ 'this is an array, not a string' ], {});
    }).toThrow(/Expected first parameter to be a string/);
  });

  it('[getInjectable] will return null when an injectable is not found', () => {
    expect(moduleGroup.getInjectable('not a registered thing')).toBeNull();
  });
});
