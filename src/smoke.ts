import { createVivaProviderMethods } from './provider/provider'
import { coerceConfig } from './config'

async function main() {
  const app = {
    debug: console.log,
    error: console.error,
    registerWeatherProvider: () => {}
  }

  const config = coerceConfig({
    logging: { debug: true }
  })

  const { methods } = createVivaProviderMethods(app, config)

  const pos = { latitude: 59.3315, longitude: 18.066 } // Stockholm
  console.log(await methods.getObservations(pos, { maxCount: 1 }))
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

