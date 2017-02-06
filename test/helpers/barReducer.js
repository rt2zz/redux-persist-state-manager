import { REHYDRATE } from 'redux-persist/constants'

export default function (state = { random: Math.random() }, action) {
  switch (action.type) {
    case REHYDRATE:
      return Object.assign({}, action.payload.barReducer)
    default:
      return state
  }
}
