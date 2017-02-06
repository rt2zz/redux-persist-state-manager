import { test } from 'ava'
import stateManager from '../src'

import { combineReducers } from 'redux'
import { REHYDRATE } from 'redux-persist/constants'

import fooReducer from './helpers/fooReducer'
import barReducer from './helpers/barReducer'

const rootReducer = combineReducers({
  foo: fooReducer,
  bar: barReducer,
})
const initialState = rootReducer(undefined, {})

test('clear stored state migration', t => {
  const stateMigrations = {
    '1': (state) => ({}) // remove everything from stored state (fresh start)
  }
  const storedState = {
    foo: 'boo',
    bar: { random: 'not-so-random' },
  }
  const rehydrateAction = {
    type: REHYDRATE,
    payload: storedState,
  }

  const VERSION = 1 // integer representation of the version of your state
  const stateManagedReducer = stateManager(rootReducer, { version: VERSION }, stateMigrations)
  const newState = stateManagedReducer(initialState, rehydrateAction)
  Object.keys(newState).forEach((key) => {
    t.notDeepEqual(newState[key], storedState[key])
  })
})

test('hard set new value migration', t => {
  const stateMigrations = {
    '1': (state) => Object.assign({}, state, { foo: 2 }),
  }
  const rehydrateAction = {
    type: REHYDRATE,
    payload: initialState,
  }

  const VERSION = 1 // integer representation of the version of your state
  const stateManagedReducer = stateManager(rootReducer, { version: VERSION }, stateMigrations)
  const newState = stateManagedReducer(initialState, rehydrateAction)
  t.deepEqual(newState.foo, 2)
})
