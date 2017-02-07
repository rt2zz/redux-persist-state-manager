import { REHYDRATE } from 'redux-persist/constants'
import isStatePlainEnough from 'redux-persist/lib/utils/isStatePlainEnough'

export default (reducer, config, migrations) => {
  const version = config.version
  const log = config.log || true
  const debug = config.debug || false

  if (!version) throw new Error('redux-persist-state-manager: version is required')

  const versionedReducer = createVersionedReducer(reducer, version)
  return (state, action) => {
    if (action.type !== REHYDRATE) {
      return versionedReducer(state, action)
    } else {
      let inboundState = action.payload
      let migratedInboundState = migrateState(inboundState, migrations, version, config)
      let reducedState = versionedReducer(state, action)
      return stateReconciler(state, migratedInboundState, reducedState, { debug, log })
    }
  }
}

const createVersionedReducer = (reducer, currentVersion) => (state, action) => {
  let { version, ...restState } = state || {}
  if (!state) restState = state

  // @NOTE remove version because of combineReducers warning
  return {
    ...reducer(restState, action),
    version: currentVersion,
  }
}

const migrateState = (state, migrations, currentVersion, { debug, log }) => {
  if (process.env.NODE_ENV !== 'production') {
    // if the migrated state has keys, but is missing version, show dev warning
    if (Object.keys(state).length > 0 && !state.version) console.log('redux-persist-state-manager: every persistor needs to have the version reducer in scope (either in whitelist or not in blacklist). If this is the first run after installing state manager, ignore this warning.')
  }
  let inboundVersion = state.version || 0
  if (inboundVersion === currentVersion) {
    if (debug) console.log('redux-persist-state-manager: verions match, noop migration')
    return state
  }
  if (inboundVersion > currentVersion) {
    if (debug) console.error('redux-persist-state-manager: downgrading version is not supported')
    return state
  }

  let migrationKeys = Object
    .keys(migrations)
    .map((ver) => parseInt(ver))
    .filter((key) => key > inboundVersion)
    .sort()

  if (log) console.log('redux-persist-state-manager: migrationKeys', migrationKeys)
  let migratedState = migrationKeys.reduce((state, versionKey) => {
    if (debug) console.log('redux-persist-state-manager: running migration for versionKey', versionKey)
    return migrations[versionKey](state)
  }, state)

  return migratedState
}

function stateReconciler(state, inboundState, reducedState, { debug, log }) {
  let newState = {...reducedState}

  Object.keys(inboundState).forEach((key) => {

    if (process.env.NODE_ENV !== 'production' && log) {
      // check if initialState is missing a key
      if (!state.hasOwnProperty(key)) console.log(`
        redux-persist-state-manager/autoRehydrate: state missing key
        "${key}". state-manager will still store the rehydrated value. If you
        removed ${key} from your reducer tree, you should write a migration to
        remove ${key} from stored state. If you code-split ${key} reducer, then
        this is the expected behavior.
      `)

      // check recently added reducer properties that may require a migration
      if (typeof state[key] === 'object' && typeof inboundState[key] === 'object') {
        const stateKeys = Object.keys(state[key])
        const inboundStateKeys = Object.keys(inboundState[key])
        stateKeys.forEach((checkKey) => {
          if (inboundState[checkKey] === 'undefined') console.log(`
            redux-persist-state-manager/autoRehydrate: initialState for "${key}"
            has property "${checkKey}" which is missing in rehydratedState. After
            rehydration, "${checkKey}" will be null. If you recently added
            ${checkKey} to your ${key} reducer, consider adding ${checkKey} to a
            state migration.
          `)
        })
      }
    }

    if (state[key] !== reducedState[key]) {
      // if reducer modifies substate, skip auto rehydration
      if (debug) console.log('redux-redux-persist-state-manager/autoRehydrate: sub state for key `%s` modified, skipping autoRehydrate.', key)
      newState[key] = reducedState[key]
      return
    } else {
      // otherwise take the inboundState, hard set not shallow merge
      newState[key] = inboundState[key]
    }

    if (debug) console.log('redux-redux-persist-state-manager/autoRehydrate: key `%s`, rehydrated to ', key, newState[key])
  })
  return newState
}
