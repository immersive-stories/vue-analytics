import config, { getId } from '../config'
import { getMethod } from '../helpers'

let intr
let coll = []

export default function query (method, ...args) {
  if (typeof window === 'undefined') {
    return
  }

  getId().forEach(function (id) {
    const t = {
      m: getMethod(method, id),
      a: args
    }

    // Check if it is online/offline - If it is offline, add to the ga-cache.
    let isOffline = !window.navigator.onLine
    if (!window.localStorage.getItem('ga-cache')) {
      window.localStorage.setItem('ga-cache', JSON.stringify([]))
    }

    if (isOffline) {
      let cache = window.localStorage.getItem('ga-cache')
      if (cache) {
        cache = JSON.parse(cache)
        cache.push(t)
        console.log("Push Item to offline Queue: ", t)
        console.log("OfflineQueue: ", cache)
        window.localStorage.setItem('ga-cache', JSON.stringify(cache))
      }
    } else {
      let cache = window.localStorage.getItem('ga-cache')
      if (cache) {
        cache = JSON.parse(cache)
        if (cache) {
          let item = cache.shift()
          do {
            if (item) {
              window.ga(item.m, ...item.a)
            }
            item = cache.shift()
          } while(!!item)
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
