import NoteList from '@/components/NoteList'
import { BIG_RELAY_URLS, SEARCHABLE_RELAY_URLS } from '@/constants'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { Filter } from 'nostr-tools'
import { forwardRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const NoteListPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const {
    title = '',
    filter,
    urls
  } = useMemo<{
    title?: string
    filter?: Filter
    urls: string[]
  }>(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hashtag = searchParams.get('t')
    if (hashtag) {
      return {
        title: `# ${hashtag}`,
        filter: { '#t': [hashtag] },
        urls: BIG_RELAY_URLS,
        type: 'hashtag'
      }
    }
    const search = searchParams.get('s')
    if (search) {
      return {
        title: `${t('Search')}: ${search}`,
        filter: { search },
        urls: SEARCHABLE_RELAY_URLS,
        type: 'search'
      }
    }
    return { urls: BIG_RELAY_URLS }
  }, [])

  return (
    <SecondaryPageLayout ref={ref} index={index} title={title} displayScrollToTopButton>
      <NoteList key={title} filter={filter} relayUrls={urls} />
    </SecondaryPageLayout>
  )
})
NoteListPage.displayName = 'NoteListPage'
export default NoteListPage
