import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { IS_ELECTRON } from '@renderer/lib/env'
import { useNostr } from '@renderer/providers/NostrProvider'
import { ArrowLeft } from 'lucide-react'
import { Dispatch, useState } from 'react'
import PrivateKeyLogin from './NsecLogin'

export default function LoginDialog({
  open,
  setOpen
}: {
  open: boolean
  setOpen: Dispatch<boolean>
}) {
  const [loginMethod, setLoginMethod] = useState<'nsec' | 'nip07' | null>(null)
  const { nip07Login } = useNostr()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle className="hidden" />
          <DialogDescription className="hidden" />
        </DialogHeader>
        {loginMethod === 'nsec' ? (
          <>
            <div
              className="absolute left-4 top-4 opacity-70 hover:opacity-100 cursor-pointer"
              onClick={() => setLoginMethod(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </div>
            <PrivateKeyLogin onLoginSuccess={() => setOpen(false)} />
          </>
        ) : (
          <>
            {!IS_ELECTRON && !!window.nostr && (
              <Button onClick={() => nip07Login().then(() => setOpen(false))} className="w-full">
                Login with NIP-07
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLoginMethod('nsec')} className="w-full">
              Login with Private Key
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
