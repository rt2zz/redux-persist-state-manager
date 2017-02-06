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
