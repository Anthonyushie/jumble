import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { useFetchRelayInfos } from '@renderer/hooks'
import { isReplyNoteEvent } from '@renderer/lib/event'
import { cn } from '@renderer/lib/utils'
import { useNostr } from '@renderer/providers/NostrProvider'
import { useScreenSize } from '@renderer/providers/ScreenSizeProvider'
import client from '@renderer/services/client.service'
import dayjs from 'dayjs'
import { Event, Filter, kinds } from 'nostr-tools'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NoteCard from '../NoteCard'

const NORMAL_RELAY_LIMIT = 100
const ALGO_RELAY_LIMIT = 500

export default function NoteList({
  relayUrls,
  filter = {},
  className
}: {
  relayUrls: string[]
  filter?: Filter
  className?: string
}) {
  const { t } = useTranslation()
  const { isReady, signEvent } = useNostr()
  const { isFetching: isFetchingRelayInfo, areAlgoRelays } = useFetchRelayInfos(relayUrls)
  const [timelineKey, setTimelineKey] = useState<string | undefined>(undefined)
  const [events, setEvents] = useState<Event[]>([])
  const [newEvents, setNewEvents] = useState<Event[]>([])
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [initialized, setInitialized] = useState(false)
  const [displayReplies, setDisplayReplies] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const noteFilter = useMemo(() => {
    return {
      kinds: [kinds.ShortTextNote, kinds.Repost],
      limit: areAlgoRelays ? ALGO_RELAY_LIMIT : NORMAL_RELAY_LIMIT,
      ...filter
    }
  }, [JSON.stringify(filter), areAlgoRelays])

  useEffect(() => {
    if (!isReady || isFetchingRelayInfo) return

    async function init() {
      setInitialized(false)
      setEvents([])
      setNewEvents([])
      setHasMore(true)

      const { closer, timelineKey } = await client.subscribeTimeline(
        relayUrls,
        noteFilter,
        {
          onEvents: (events, eosed) => {
            if (events.length > 0) {
              setEvents(events)
            } else {
              setHasMore(false)
            }
            if (areAlgoRelays) {
              setHasMore(false)
            }
            if (eosed) {
              setInitialized(true)
            }
          },
          onNew: (event) => {
            setNewEvents((oldEvents) =>
              [event, ...oldEvents].sort((a, b) => b.created_at - a.created_at)
            )
          }
        },
        { signer: signEvent, needSort: !areAlgoRelays }
      )
      setTimelineKey(timelineKey)
      return closer
    }

    const promise = init()
    return () => {
      promise.then((closer) => closer())
    }
  }, [
    JSON.stringify(relayUrls),
    JSON.stringify(noteFilter),
    isReady,
    isFetchingRelayInfo,
    areAlgoRelays
  ])

  useEffect(() => {
    if (!initialized) return

    const options = {
      root: null,
      rootMargin: '10px',
      threshold: 1
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore()
      }
    }, options)

    if (bottomRef.current) {
      observer.current.observe(bottomRef.current)
    }

    return () => {
      if (observer.current && bottomRef.current) {
        observer.current.unobserve(bottomRef.current)
      }
    }
  }, [initialized, hasMore, events, timelineKey])

  const loadMore = async () => {
    if (!timelineKey) return

    const newEvents = await client.loadMoreTimeline(
      timelineKey,
      events.length ? events[events.length - 1].created_at - 1 : dayjs().unix(),
      noteFilter.limit
    )
    if (newEvents.length === 0) {
      setHasMore(false)
      return
    }
    setEvents((oldEvents) => [...oldEvents, ...newEvents])
  }

  const showNewEvents = () => {
    setEvents((oldEvents) => [...newEvents, ...oldEvents])
    setNewEvents([])
  }

  return (
    <div className={cn('space-y-2 sm:space-y-4', className)}>
      <DisplayRepliesSwitch displayReplies={displayReplies} setDisplayReplies={setDisplayReplies} />
      {newEvents.length > 0 && (
        <div className="flex justify-center w-full max-sm:mt-2">
          <Button size="lg" onClick={showNewEvents}>
            {t('show new notes')}
          </Button>
        </div>
      )}
      <div className="flex flex-col sm:gap-4">
        {events
          .filter((event) => displayReplies || !isReplyNoteEvent(event))
          .map((event, i) => (
            <NoteCard key={`${i}-${event.id}`} className="w-full" event={event} />
          ))}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        {hasMore ? <div ref={bottomRef}>{t('loading...')}</div> : t('no more notes')}
      </div>
    </div>
  )
}

function DisplayRepliesSwitch({
  displayReplies,
  setDisplayReplies
}: {
  displayReplies: boolean
  setDisplayReplies: (value: boolean) => void
}) {
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()

  if (isSmallScreen) {
    return (
      <div>
        <div className="flex">
          <div
            className={`w-1/2 text-center py-2 font-semibold hover:bg-muted cursor-pointer rounded-lg ${displayReplies ? 'text-muted-foreground' : ''}`}
            onClick={() => setDisplayReplies(false)}
          >
            {t('Notes')}
          </div>
          <div
            className={`w-1/2 text-center py-2 font-semibold hover:bg-muted cursor-pointer rounded-lg ${displayReplies ? '' : 'text-muted-foreground'}`}
            onClick={() => setDisplayReplies(true)}
          >
            {t('Notes & Replies')}
          </div>
        </div>
        <div
          className={`w-1/2 px-4 transition-transform duration-500 ${displayReplies ? 'translate-x-full' : ''}`}
        >
          <div className="w-full h-1 bg-primary rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end gap-2">
      <div>{t('Display replies')}</div>
      <Switch checked={displayReplies} onCheckedChange={setDisplayReplies} />
    </div>
  )
}
