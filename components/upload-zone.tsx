'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import Image from 'next/image'

interface UploadZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

export function UploadZone({ files, onFilesChange }: UploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesChange([...files, ...acceptedFiles])
  }, [files, onFilesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
  })

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed p-12 text-center cursor-pointer transition-colors `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop screenshots here...'
            : 'Drag & drop screenshots, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          PNG, JPG, JPEG, WebP • Multiple files supported
        </p>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{files.length} file(s) uploaded</p>
          <div className="grid grid-cols-4 gap-4">
            {files.map((file, i) => (
              <Card key={i} className="relative p-2 group">
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="aspect-square relative bg-muted rounded">
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <p className="text-xs text-center mt-2 truncate">{file.name}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
