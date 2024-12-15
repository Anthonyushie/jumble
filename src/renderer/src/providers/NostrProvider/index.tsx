import { ISigner, TDraftEvent } from '@common/types'
import LoginDialog from '@renderer/components/LoginDialog'
import { useToast } from '@renderer/hooks'
import { useFetchRelayList } from '@renderer/hooks/useFetchRelayList'
import { isElectron } from '@renderer/lib/env'
import client from '@renderer/services/client.service'
import storage from '@renderer/services/storage.service'
import dayjs from 'dayjs'
import { Event, kinds } from 'nostr-tools'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRelaySettings } from '../RelaySettingsProvider'
import { BrowserNsecSigner } from './browser-nsec.signer'
import { Nip07Signer } from './nip-07.signer'
import { NsecSigner } from './nsec.signer'

type TNostrContext = {
  isReady: boolean
  pubkey: string | null
  setPubkey: (pubkey: string) => void
  nsecLogin: (nsec: string) => Promise<string>
  logout: () => Promise<void>
  nip07Login: () => Promise<void>
  /**
   * Default publish the event to current relays, user's write relays and additional relays
   */
  publish: (draftEvent: TDraftEvent, additionalRelayUrls?: string[]) => Promise<Event>
  signHttpAuth: (url: string, method: string) => Promise<string>
  signEvent: (draftEvent: TDraftEvent) => Promise<Event>
  checkLogin: (cb?: () => void | Promise<void>) => void
}

const NostrContext = createContext<TNostrContext | undefined>(undefined)

export const useNostr = () => {
  const context = useContext(NostrContext)
  if (!context) {
    throw new Error('useNostr must be used within a NostrProvider')
  }
  return context
}

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [isReady, setIsReady] = useState(false)
  const [pubkey, setPubkey] = useState<string | null>(null)
  const [signer, setSigner] = useState<ISigner | null>(null)
  const [openLoginDialog, setOpenLoginDialog] = useState(false)
  const { relayUrls: currentRelayUrls } = useRelaySettings()
  const relayList = useFetchRelayList(pubkey)

  useEffect(() => {
    const init = async () => {
      const account = await storage.getAccountInfo()
      if (!account) {
        if (isElectron(window) || !window.nostr) {
          return setIsReady(true)
        }

        // For browser env, attempt to login with nip-07
        const nip07Signer = new Nip07Signer()
        const pubkey = await nip07Signer.getPublicKey()
        if (!pubkey) {
          return setIsReady(true)
        }
        setPubkey(pubkey)
        setSigner(nip07Signer)
        return setIsReady(true)
      }

      if (account.signerType === 'nsec') {
        const nsecSigner = new NsecSigner()
        const pubkey = await nsecSigner.getPublicKey()
        if (!pubkey) {
          await storage.setAccountInfo(null)
          return setIsReady(true)
        }
        setPubkey(pubkey)
        setSigner(nsecSigner)
        return setIsReady(true)
      }

      if (account.signerType === 'browser-nsec') {
        if (!account.nsec) {
          await storage.setAccountInfo(null)
          return setIsReady(true)
        }
        const browserNsecSigner = new BrowserNsecSigner()
        const pubkey = browserNsecSigner.login(account.nsec)
        setPubkey(pubkey)
        setSigner(browserNsecSigner)
        return setIsReady(true)
      }

      if (account.signerType === 'nip-07') {
        const nip07Signer = new Nip07Signer()
        const pubkey = await nip07Signer.getPublicKey()
        if (!pubkey) {
          await storage.setAccountInfo(null)
          return setIsReady(true)
        }
        setPubkey(pubkey)
        setSigner(nip07Signer)
        return setIsReady(true)
      }

      await storage.setAccountInfo(null)
      return setIsReady(true)
    }
    init().catch(() => {
      storage.setAccountInfo(null)
      setIsReady(true)
    })
  }, [])

  const nsecLogin = async (nsec: string) => {
    if (isElectron(window)) {
      const nsecSigner = new NsecSigner()
      const { pubkey, reason } = await nsecSigner.login(nsec)
      if (!pubkey) {
        throw new Error(reason ?? 'invalid nsec')
      }
      await storage.setAccountInfo({ signerType: 'nsec' })
      setPubkey(pubkey)
      setSigner(nsecSigner)
      return pubkey
    }
    const browserNsecSigner = new BrowserNsecSigner()
    const pubkey = browserNsecSigner.login(nsec)
    await storage.setAccountInfo({ signerType: 'browser-nsec', nsec })
    setPubkey(pubkey)
    setSigner(browserNsecSigner)
    return pubkey
  }

  const nip07Login = async () => {
    try {
      const nip07Signer = new Nip07Signer()
      const pubkey = await nip07Signer.getPublicKey()
      if (!pubkey) {
        throw new Error('You did not allow to access your pubkey')
      }
      await storage.setAccountInfo({ signerType: 'nip-07' })
      setPubkey(pubkey)
      setSigner(nip07Signer)
    } catch (err) {
      toast({
        title: 'Login failed',
        description: (err as Error).message,
        variant: 'destructive'
      })
      throw err
    }
  }

  const logout = async () => {
    if (signer instanceof NsecSigner) {
      await signer.logout()
    } else if (signer instanceof BrowserNsecSigner) {
      signer.logout()
    }
    setPubkey(null)
    await storage.setAccountInfo(null)
  }

  const signEvent = async (draftEvent: TDraftEvent) => {
    const event = await signer?.signEvent(draftEvent)
    if (!event) {
      throw new Error('sign event failed')
    }
    return event
  }

  const publish = async (draftEvent: TDraftEvent, additionalRelayUrls: string[] = []) => {
    const event = await signEvent(draftEvent)
    await client.publishEvent(
      relayList.write.concat(additionalRelayUrls).concat(currentRelayUrls),
      event
    )
    return event
  }

  const signHttpAuth = async (url: string, method: string) => {
    const event = await signEvent({
      content: '',
      kind: kinds.HTTPAuth,
      created_at: dayjs().unix(),
      tags: [
        ['u', url],
        ['method', method]
      ]
    })
    return 'Nostr ' + btoa(JSON.stringify(event))
  }

  const checkLogin = async (cb?: () => void) => {
    if (pubkey) {
      return cb && cb()
    }
    return setOpenLoginDialog(true)
  }

  return (
    <NostrContext.Provider
      value={{
        isReady,
        pubkey,
        setPubkey,
        nsecLogin,
        nip07Login,
        logout,
        publish,
        signHttpAuth,
        checkLogin,
        signEvent
      }}
    >
      {children}
      <LoginDialog open={openLoginDialog} setOpen={setOpenLoginDialog} />
    </NostrContext.Provider>
  )
}
