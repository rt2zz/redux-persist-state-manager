# Redux Persist State Manager
Replacement for autoRehydrate with the following properties:
- state migrations
- hard set rehydrated values (no longer shallow merge)
- implemented as higher order reducer
- helpful log messages for common use case concerns

## Usage
```js
import stateManager from 'redux-persist-state-manager'
import _ from 'lodash'

// normal redux reducer
import rootReducer from './reducers'

const stateMigrations = {
  '1': (state) => ({}), // remove everything from stored state (fresh start)
  '2': (state) => _.pick(state, ['reducerA']), // keep only reducerA
  '3': (state) => _.omit(state, ['reducerB']), // remove reducerB from state
}

const VERSION = 3 // integer representation of the version of your state
const stateManagedReducer = stateManager(rootReducer, { version: VERSION }, stateMigrations)
```

## How Migrations Work
Every time state manager loads it stores the current version (as defined at setup) in redux state. If the app later loads with a new version, state manager will run any migrations that are between the previously stored version and the latest version. For example:
```js
// stored state: `{ version: 2,  counter: 100}`

const stateMigrations = {
  '1': (state) => ({}),
  '2': (state) => ({}),
  '3': (state) => { 
    state.counter = state.counter + 1
    return state
  }
}

const VERSION = 3
const stateManagedReducer = stateManager(rootReducer, { version: VERSION }, stateMigrations)
```
What happens:
1. redux-persist loads stored state
1. REHYDRATE action is dispatched
1. stateManager see the old version is 2 and the new version 3, and decides to run all migrations > 2 and <= 3
1. migration 3 is run which increments the counter
1. rehydrated state is now `{ version: 3,  counter: 101 }`
