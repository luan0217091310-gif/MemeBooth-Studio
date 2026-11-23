import { useState } from 'react'
import { Download, Share2, Upload, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  appUrl,
  canShareFile,
  LocalShareProvider,
  UploadShareProvider,
} from '@/core/share/providers'
import { downloadBlob } from '@/core/capture/filename'
import { useShare } from '@/store/share'
import { vi } from '@/i18n/vi'

/**
 * Share modal: download, OS share sheet (only when the device can share
 * files), QR that opens the app elsewhere, and a QR to the image only when
 * the user enabled their own upload endpoint.
 */
export function ShareModal() {
  const { file, close, uploadEnabled, endpoint } = useShare()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle')
  if (!file) return null
  const f = new File([file.blob], file.name, { type: file.blob.type })
  const upload = new UploadShareProvider(endpoint)
  const canUpload = uploadEnabled && upload.isAvailable()
  const done = () => {
    setQrUrl(null)
    setState('idle')
    close()
  }
  return (
    <div
      className="review"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
    >
      <div className="review-card share-card">
        <header>
          <h2 id="share-title">{vi.share.title}</h2>
          <button className="round" aria-label={vi.close} onClick={done}>
            <X size={18} />
          </button>
        </header>
        <div className="card-actions">
          <button
            className="primary"
            onClick={() => downloadBlob(file.blob, file.name)}
          >
            <Download size={18} /> {vi.share.download}
          </button>
          {canShareFile(f) && (
            <button
              className="ghost"
              onClick={() =>
                void new LocalShareProvider().share(file.blob, file.name)
              }
            >
              <Share2 size={18} /> {vi.share.share}
            </button>
          )}
          {canUpload && !qrUrl && (
            <button
              className="ghost"
              disabled={state === 'uploading'}
              onClick={() => {
                setState('uploading')
                upload
                  .share(file.blob, file.name)
                  .then((r) => {
                    setQrUrl(r.qrUrl ?? null)
                    setState('idle')
                  })
                  .catch(() => setState('error'))
              }}
            >
              <Upload size={18} />{' '}
              {state === 'uploading' ? vi.share.uploading : vi.share.upload}
            </button>
          )}
        </div>
        {state === 'error' && (
          <p className="panel-note warn">{vi.share.uploadFailed}</p>
        )}
        <div className="qr-row">
          <figure>
            <QRCodeSVG
              value={appUrl()}
              size={148}
              marginSize={2}
              title={vi.share.qrApp}
            />
            <figcaption>{vi.share.qrApp}</figcaption>
          </figure>
          {qrUrl && (
            <figure>
              <QRCodeSVG
                value={qrUrl}
                size={148}
                marginSize={2}
                title={vi.share.qrImage}
              />
              <figcaption>{vi.share.qrImage}</figcaption>
            </figure>
          )}
        </div>
        <p className="panel-note">
          {canUpload ? vi.share.uploadOn : vi.share.privacy}
        </p>
      </div>
    </div>
  )
}

/** Settings block for the optional upload provider. */
export function ShareSettings() {
  const { uploadEnabled, endpoint, configure } = useShare()
  const [value, setValue] = useState(endpoint)
  const valid = new UploadShareProvider(value).isAvailable()
  return (
    <div className="share-settings">
      <label className="switch">
        <input
          type="checkbox"
          checked={uploadEnabled}
          disabled={!valid}
          onChange={(e) => configure(e.target.checked, value)}
        />
        {vi.share.enableUpload}
      </label>
      <label className="field">
        {vi.share.endpoint}
        <input
          value={value}
          placeholder="https://…"
          onChange={(e) => {
            setValue(e.target.value)
            if (uploadEnabled)
              configure(
                new UploadShareProvider(e.target.value).isAvailable(),
                e.target.value,
              )
          }}
        />
      </label>
      <p className="panel-note">{vi.share.uploadHelp}</p>
    </div>
  )
}
