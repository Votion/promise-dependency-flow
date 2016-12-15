'use strict';

const promiseDependencyFlow = require('../index');

describe('Test Promise Dependency Flow', () => {
  it('works with an empty task object', () => {
    return promiseDependencyFlow({})
      .then(data => {
        expect(data).toEqual({});
      });
  });

  it('works with promise tasks', () => {
    return promiseDependencyFlow({
      boom: Promise.resolve('BAM'),
    })
      .then(data => {
        expect(data).toEqual({boom : 'BAM'});
      });
  });

  it('works with function tasks', () => {
    return promiseDependencyFlow({
      lip: () => Promise.resolve('balm'),
      sun: () => Promise.resolve('block'),
    })
      .then(data => {
        expect(data).toEqual({lip : 'balm', sun: 'block'});
      });
  });

  it('passes parameters into dependent tasks', () => {
    promiseDependencyFlow({
      foo: Promise.resolve('FOO'),
      bar: () => Promise.resolve('BAR'),
      car: {
        task: () => Promise.resolve('CAR'),
      },
      job: {
        dependencies: ['bar', 'foo'],
        task: (bar, foo) => Promise.resolve('JOB: ' + bar + foo),
      },
    }).then(data => {
      expect(data).toEqual({foo : 'FOO', bar: 'BAR', car: 'CAR', job: 'JOB: BARFOO'});
    });
  });
});
        