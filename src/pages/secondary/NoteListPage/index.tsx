import NoteList from '@/components/NoteList'
import { useSearchParams } from '@/hooks'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { isWebsocketUrl } from '@/lib/url'
import { useRelaySettings } from '@/providers/RelaySettingsProvider'
import { Filter } from 'nostr-tools'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function NoteListPage() {
  const { t } = useTranslation()
  const { relayUrls, searchableRelayUrls } = useRelaySettings()
  const { searchParams } = useSearchParams()
  const relayUrlsString = JSON.stringify(relayUrls)
  const {
    title = '',
    filter,
    urls
  } = useMemo<{
    title?: string
    filter?: Filter
    urls: string[]
  }>(() => {
    const hashtag = searchParams.get('t')
    if (hashtag) {
      return { title: `# ${hashtag}`, filter: { '#t': [hashtag] }, urls: relayUrls }
    }
    const search = searchParams.get('s')
    if (search) {
      return { title: `${t('search')}: ${search}`, filter: { search }, urls: relayUrls }
    }
    const relayUrl = searchParams.get('relay')
    if (relayUrl && isWebsocketUrl(relayUrl)) {
      return { title: relayUrl, urls: [relayUrl] }
    }
    return { urls: relayUrls }
  }, [searchParams, relayUrlsString])

  if (filter?.search && searchableRelayUrls.length === 0) {
    return (
      <SecondaryPageLayout titlebarContent={title}>
        <div className="text-center text-sm text-muted-foreground">
          {t('The relays you are connected to do not support search')}
        </div>
      </SecondaryPageLayout>
    )
  }

  return (
    <SecondaryPageLayout titlebarContent={title}>
      <NoteList key={title} filter={filter} relayUrls={urls} />
    </SecondaryPageLayout>
  )
}
