// Reduz uma imagem antes de enviar: no máximo `maxSize` pixels no lado maior, em WebP.
// Logos aparecem pequenas (na impressão, ~50 px de altura), então o arquivo original só gasta tráfego.
export async function compressImage(file: File, maxSize = 600): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'logo'
    const extension = blob.type === 'image/webp' ? 'webp' : 'png'
    return new File([blob], `${baseName}.${extension}`, { type: blob.type })
  } catch {
    return file
  }
}
