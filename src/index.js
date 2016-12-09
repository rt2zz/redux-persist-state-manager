import { REHYDRATE } from 'redux-persist/constants'
import isStatePlainEnough from 'redux-persist/lib/utils/isStatePlainEnough'

export default (reducer, config, migrations) => {
  const version = config.version
  if (!version) throw new Error('redux-persist-state-manager: version is required')

  const versionedReducer = createVersionedReducer(reducer, version)
  return (state, action) => {
    if (action.type !== REHYDRATE) {
      return versionedReducer(state, action)
    } else {
      let inboundState = action.payload
      let migratedInboundState = migrateState(inboundState, migrations, version, config)
      let reducedState = versionedReducer(state, action)
      return stateReconciler(state, migratedInboundState, reducedState, config)
    }
  }
}

const createVersionedReducer = (reducer, currentVersion) => (state, action) => {
  // @NOTE remove version because of combineReducers warning
  const { version, ...restState } = state
  return {
    ...reducer(restState, action),
    version: currentVersion,
  }
}

const migrateState = (state, migrations, currentVersion, { log }) => {
  if (!state.version && process.env.NODE_ENV !== 'production') console.error('redux-persist-state-manager: every persistor needs to have the version reducer in scope (either in whitelist or not in blacklist)')

  let inboundVersion = state.version || 0
  if (inboundVersion === currentVersion) {
    if (log) console.log('verions match, noop migration')
    return state
  }
  if (inboundVersion > currentVersion) {
    if (log) console.error('downgrading version is not supported')
    return
  }

  let migrationKeys = Object
    .keys(migrations)
    .map((ver) => parseInt(ver))
    .filter((key) => key > inboundVersion)
    .sort()

  if (log) console.log('migrationKeys', migrationKeys)
  let migratedState = migrationKeys.reduce((state, versionKey) => {
    if (log) console.log('running migration', versionKey)
    return migrations[versionKey](state)
  }, state)

  return migratedState
}

function stateReconciler(state, inboundState, reducedState, { log }) {
  let newState = {...reducedState}

  Object.keys(inboundState).forEach((key) => {
    // if initialState does not have key, skip auto rehydration
    if (!state.hasOwnProperty(key)) return

    // if initial state is an object but inbound state is null/undefined, skip
    if (typeof state[key] === 'object' && !inboundState[key]) {
      if (log) console.log('redux-persist/autoRehydrate: sub state for key `%s` is falsy but initial state is an object, skipping autoRehydrate.', key)
      return
    }

    // if reducer modifies substate, skip auto rehydration
    if (state[key] !== reducedState[key]) {
      if (log) console.log('redux-persist/autoRehydrate: sub state for key `%s` modified, skipping autoRehydrate.', key)
      newState[key] = reducedState[key]
      return
    }

    // otherwise take the inboundState
    if (isStatePlainEnough(inboundState[key]) && isStatePlainEnough(state[key])) newState[key] = {...state[key], ...inboundState[key]} // shallow merge
    else newState[key] = inboundState[key] // hard set

    if (log) console.log('redux-persist/autoRehydrate: key `%s`, rehydrated to ', key, newState[key])
  })
  return newState
}
