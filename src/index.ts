import 'websocket-polyfill'
import { relayInit } from 'nostr-tools'
import type { Event } from 'nostr-tools'
import process from 'node:process'
import { getHexPublicKey } from './utils'

const publicKeyArg = process.argv[2]
const relayArg = process.argv[3]

if (publicKeyArg === undefined) {
  console.log('public key is missing as the first argument.')
  process.exit(1)
}

if (relayArg === undefined) {
  console.log('relay is missing as the second argument.')
  process.exit(1)
}

const pk = getHexPublicKey(publicKeyArg)

const relayFromUrls = [
  'wss://no.str.cr',
  'wss://paid.no.str.cr',
  'wss://nostr.fly.dev',
  'wss://relay.snort.social',
  'wss://relay.realsearch.cc',
  'wss://relay.nostrgraph.net',
  'wss://relay.minds.com/nostr/v1/ws',
  'wss://nos.lol',
  'wss://relay.current.fyi',
  'wss://puravida.nostr.land',
  'wss://nostr.milou.lol',
  'wss://eden.nostr.land',
  'wss://relay.damus.io',
  'wss://nostr.oxtr.dev',
]

const relayToUrl = relayArg

const eventsReceived: string[] = []

relayFromUrls.forEach(async (relayUrl) => {
  const { relay: relayFrom } = await connect(relayUrl)

  const { relay: relayTo } = await connect(relayToUrl)

  const eventsToMove: Event[] = []

  relayFrom.on('connect', () => {
    console.log(`connected to ${relayFrom.url}`)
  })

  relayTo.on('connect', () => {
    console.log(`connected to ${relayTo.url}`)
  })

  const sub = relayFrom.sub([
    {
      authors: [pk],
    }
  ])
  sub.on('event', (event: Event) => {
    if (!event.id) return
    if(eventsReceived.indexOf(event.id) === -1) {
      eventsToMove.push(event)
      eventsReceived.push(event.id)
    }
  })
  sub.on('eose', async () => {
    sub.unsub()

    console.log(`got ${eventsToMove.length} events from ${relayFrom.url}`)

    eventsToMove.forEach(async (event, index) => {
      const pub = relayTo.publish(event)
      pub.on('ok', async () => {
        console.log(`${relayTo.url} has accepted our event from ${relayFrom.url} on ${new Date(event.created_at * 1000).toISOString()} of kind ${event.kind} and ID ${event.id}`)

        if(index == eventsToMove.length - 1) {
          console.log(`done with ${relayFrom.url}`)
          await relayFrom.close()
          await relayTo.close()
        }
      })
    })
  })
})

async function connect(relayUrl: string) {
  const relay = relayInit(relayUrl)

  try {
    await relay.connect()
  } catch (error) {
    console.error(`could not connect to: ${relayUrl}, skipping.`)
  }

  return { relay }
}
