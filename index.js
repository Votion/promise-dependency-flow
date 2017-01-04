'use strict';

/**
 * Normalize the structure of the tasks by converting implicit into explicit
 *
 * @param tasks
 * @return {{}}
 */
function normalizeTasks(tasks) {
  const normalizedTasks = {};

  for (let name in tasks) {
    const taskDef = tasks[name];

    if (taskDef instanceof Promise) {
      normalizedTasks[name] = {
        dependencies: [],
        task: () => taskDef,
      };
    } else if (typeof taskDef === 'function') {
      normalizedTasks[name] = {
        dependencies: [],
        task: taskDef,
      };
    } else {
      const def = {
        dependencies: [],
        task: () => null,
      };
      Object.assign(def, taskDef);

      normalizedTasks[name] = def;
    }
  }

  return normalizedTasks;
}

function promiseDependencyFlow(tasks) {
  const normalizedTasks = normalizeTasks(tasks);

  function execute(injectedDeps) {
    return new Promise((resolve, reject) => {
      const data = {};
      Object.assign(data, injectedDeps || {});

      const waitingFor = {};
      const blocking = {};

      let remaining = 0;

      function removeBlockedFromWaiting(blocker, blocked) {
        const wf = waitingFor[blocked];
        wf.splice(wf.indexOf(blocker), 1);
      }

      function canRunTask(name) {
        return waitingFor[name].length === 0;
      }

      function runTask(name) {
        const args = normalizedTasks[name].dependencies.map(n => data[n]);
        normalizedTasks[name].task.apply(null, args).then(next(name), catchError(name));
      }

      function next(name) {
        return (val) => {
          data[name] = val;

          remaining -= 1;

          if (remaining > 0) {
            blocking[name].forEach(blockedName => {
              removeBlockedFromWaiting(name, blockedName);

              if (canRunTask(blockedName)) {
                runTask(blockedName);
              }
            });
          } else {
            resolve(data);
          }
        };
      }

      function catchError(name) {
        return (error) => reject({ name, error });
      }

      // Populate waitingFor and holdingOn
      for (let name in normalizedTasks) {
        const deps = normalizedTasks[name].dependencies;
        waitingFor[name] = Array.from(deps);

        blocking[name] = blocking[name] || [];
        deps.forEach(depName => {
          blocking[depName] = blocking[depName] || [];
          blocking[depName].push(name);
        });

        remaining += 1;
      }

      // Run the non-blocked tasks
      for (let name in waitingFor) {
        if (canRunTask(name)) {
          normalizedTasks[name].task().then(next(name), catchError(name));
        }
      }

      // Run the injected dependencies
      if (typeof injectedDeps === 'object') {
        for (let name in injectedDeps) {
          remaining += 1;
          next(name)(injectedDeps[name]);
        }
      }

      if (remaining === 0) {
        resolve(data);
      }
    });
  }

  return execute;
}

module.exports = promiseDependencyFlow;
