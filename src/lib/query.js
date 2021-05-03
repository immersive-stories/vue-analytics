import config, { getId } from '../config'
import { getMethod } from '../helpers'

let intr
let coll = []

export default function query (method, ...args) {
  if (typeof window === 'undefined') {
    return
  }

  getId().forEach(async function (id) {
    const t = {
      m: getMethod(method, id),
      a: args
    }

    // Check if it is online/offline - If it is offline, add to the ga-cache.
    if (!window.localStorage.getItem('ga-cache')) {
      window.localStorage.setItem('ga-cache', JSON.stringify([]))
    }

    if (!window.isOnline) {
      let cache = window.localStorage.getItem('ga-cache')
      if (cache) {
        cache = JSON.parse(cache)
        cache.push(t)
        window.localStorage.setItem('ga-cache', JSON.stringify(cache))
      }
    } else {
      let cache = window.localStorage.getItem('ga-cache')
      if (cache) {
        cache = JSON.parse(cache)
        if (cache) {
          let item = cache.shift()
          while(item) {
            if (item) {
              window.ga(getMethod(method, id), ...args)
            }
            item = cache.shift()
          }
          window.localStorage.setItem('ga-cache', JSON.stringify(cache))
        }
      }

      if(!window.ga) {
        config.untracked.push(t)
        return
      }

      if (config.batch.enabled) {
        coll.push(t)

        if (!intr) {
          intr = setInterval(() => {
            if (!coll.length) {
              clearInterval(intr)
              intr = null
            } else {
              coll.splice(0, config.batch.amount).forEach(q => {
                window.ga(q.m, ...q.a)
              })
            }
          }, config.batch.delay)
        }
      } else {
        window.ga(getMethod(method, id), ...args)
      }
    }
  })
}
