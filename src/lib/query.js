import config, { getId } from '../config'
import { getMethod } from '../helpers'

let intr
let coll = []

function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TimeOut'))
    }, ms)

    promise.then(value => {
      clearTimeout(timer)
      resolve(value)
    }).catch(reason => {
      clearTimeout(timer)
      reject(reason)
    })
  })
}

async function isWebAppOffline() {
  return timeout(8000, fetch('http://numbersapi.com/5/math'))
    .then(() => false)
    .catch(() => true)
}

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

    let isOffline = await isWebAppOffline()
    console.log("Is webAppOffline?", isOffline)
    if (isOffline) {
      let cache = window.localStorage.getItem('ga-cache')
      if (cache) {
        cache = JSON.parse(cache)
        cache.push(t)
        console.log("Push Item: ", t)
        window.localStorage.setItem('ga-cache', JSON.stringify(cache))
      }
    } else {
      let cache = window.localStorage.getItem('ga-cache')
      if (cache) {
        cache = JSON.parse(cache)
        if (cache) {
          let item = cache.shift()
          console.log("Shiftet Item from Q", item)
          while(item) {
            if (item) {
              window.ga(item.m, ...item.a)
            }
            item = cache.shift()
            console.log("Shiftet Item from Q", item)
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
