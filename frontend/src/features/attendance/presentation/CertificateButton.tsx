import { FileDown } from 'lucide-react'
import { getErrorMessage } from '../../../core/http/api-error'
import { Button } from '../../../shared/ui/Button'
import { useToast } from '../../../shared/ui/toast'
import { useDownloadCertificate } from '../application/attendance.queries'

/** Botón para descargar la constancia de asistencia en PDF. */
export function CertificateButton({ studentId, moduleId, label = 'Constancia PDF' }: { studentId?: number; moduleId?: number; label?: string }) {
  const download = useDownloadCertificate()
  const toast = useToast()
  return (
    <Button
      variant="secondary"
      icon={<FileDown className="size-4" />}
      loading={download.isPending}
      onClick={() =>
        download.mutate(
          { studentId, moduleId },
          {
            onSuccess: (fileName) => toast.success(`Se descargó ${fileName}`),
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        )
      }
    >
      {label}
    </Button>
  )
}
