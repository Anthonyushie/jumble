import { TDraftEvent } from '@common/types'
import { tagNameEquals } from '@renderer/lib/tag'
import client from '@renderer/services/client.service'
import dayjs from 'dayjs'
import { Event, kinds } from 'nostr-tools'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNostr } from './NostrProvider'

type TFollowListContext = {
  followListEvent: Event | undefined
  followings: string[]
  isReady: boolean
  follow: (pubkey: string) => Promise<void>
  unfollow: (pubkey: string) => Promise<void>
}

const FollowListContext = createContext<TFollowListContext | undefined>(undefined)

export const useFollowList = () => {
  const context = useContext(FollowListContext)
  if (!context) {
    throw new Error('useFollowList must be used within a FollowListProvider')
  }
  return context
}

export function FollowListProvider({ children }: { children: React.ReactNode }) {
  const { pubkey: accountPubkey, publish } = useNostr()
  const [followListEvent, setFollowListEvent] = useState<Event | undefined>(undefined)
  const [isReady, setIsReady] = useState(false)
  const followings = useMemo(
    () =>
      followListEvent?.tags
        .filter(tagNameEquals('p'))
        .map(([, pubkey]) => pubkey)
        .filter(Boolean)
        .reverse() ?? [],
    [followListEvent]
  )

  useEffect(() => {
    if (isReady || !accountPubkey) return

    const init = async () => {
      const event = await client.fetchFollowListEvent(accountPubkey)
      setFollowListEvent(event)
      setIsReady(true)
    }

    init()
  }, [accountPubkey])

  const follow = async (pubkey: string) => {
    if (!isReady || !accountPubkey) return

    const newFollowListDraftEvent: TDraftEvent = {
      kind: kinds.Contacts,
      content: followListEvent?.content ?? '',
      created_at: dayjs().unix(),
      tags: (followListEvent?.tags ?? []).concat([['p', pubkey]])
    }
    const newFollowListEvent = await publish(newFollowListDraftEvent)
    client.updateFollowListCache(accountPubkey, newFollowListEvent)
    setFollowListEvent(newFollowListEvent)
  }

  const unfollow = async (pubkey: string) => {
    if (!isReady || !accountPubkey || !followListEvent) return

    const newFollowListDraftEvent: TDraftEvent = {
      kind: kinds.Contacts,
      content: followListEvent.content ?? '',
      created_at: dayjs().unix(),
      tags: followListEvent.tags.filter(
        ([tagName, tagValue]) => tagName !== 'p' || tagValue !== pubkey
      )
    }
    const newFollowListEvent = await publish(newFollowListDraftEvent)
    client.updateFollowListCache(accountPubkey, newFollowListEvent)
    setFollowListEvent(newFollowListEvent)
  }

  return (
    <FollowListContext.Provider
      value={{
        followListEvent,
        followings,
        isReady,
        follow,
        unfollow
      }}
    >
      {children}
    </FollowListContext.Provider>
  )
}
