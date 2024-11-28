import { TWebMetadata } from '@renderer/types'
import { useEffect, useState } from 'react'
import webService from '@renderer/services/web.service'

export function useFetchWebMetadata(url: string) {
  const [metadata, setMetadata] = useState<TWebMetadata>({})

  useEffect(() => {
    webService.fetchWebMetadata(url).then((metadata) => setMetadata(metadata))
  }, [url])

  return metadata
}
