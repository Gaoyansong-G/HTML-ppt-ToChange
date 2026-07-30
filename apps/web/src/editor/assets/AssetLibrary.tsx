import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Asset } from '@courseware/shared';
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  Image as ImageIcon,
  Library,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ASSET_FILE_ACCEPT,
  AssetBatchUploadError,
  assetTypeLabel,
  formatFileSize,
  uploadAssetFiles,
  type AssetUploadProgress,
} from './asset-utils';

type AssetFilter = 'all' | 'image' | 'audio' | 'video';

interface AssetLibraryProps {
  open: boolean;
  assets: Asset[];
  filter?: AssetFilter;
  title?: string;
  selectedAssetId?: string;
  selectionMode?: boolean;
  onClose: () => void;
  onAssetsAdded: (assets: Asset[]) => void;
  onSelect?: (asset: Asset) => void;
  onDelete: (asset: Asset) => Promise<void>;
  getUsageCount: (assetId: string) => number;
}

function AssetPreview({ asset, compact = false }: { asset: Asset; compact?: boolean }) {
  if (asset.type === 'image') {
    return (
      <img
        src={asset.url}
        alt={asset.description || asset.filename}
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }
  if (asset.type === 'audio') {
    return (
      <div
        className="flex w-full flex-col items-center gap-3 px-2"
        onClick={(event) => event.stopPropagation()}
      >
        {compact && <FileAudio size={28} className="text-violet-500" />}
        <audio src={asset.url} controls preload="metadata" className="h-8 w-full" />
      </div>
    );
  }
  if (asset.type === 'video') {
    return (
      <video
        src={asset.url}
        controls
        preload="metadata"
        className="h-full w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    );
  }
  return <Library size={32} className="text-slate-400" />;
}

export function AssetLibrary({
  open,
  assets,
  filter: initialFilter = 'all',
  title = '素材库',
  selectedAssetId,
  selectionMode = false,
  onClose,
  onAssetsAdded,
  onSelect,
  onDelete,
  getUsageCount,
}: AssetLibraryProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AssetFilter>(initialFilter);
  const [uploadProgress, setUploadProgress] = useState<AssetUploadProgress | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFilter(initialFilter);
    setSearch('');
    setMessage(null);
    setUploadProgress(null);
  }, [initialFilter, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const visibleAssets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return assets
      .filter((asset) => filter === 'all' || asset.type === filter)
      .filter((asset) => {
        if (!query) return true;
        return [asset.filename, asset.description, asset.mimeType, assetTypeLabel(asset.type)]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(query));
      })
      .slice()
      .reverse();
  }, [assets, filter, search]);

  if (!open) return null;

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    setMessage(null);
    if (
      initialFilter !== 'all' &&
      files.some((file) => !file.type.toLowerCase().startsWith(`${initialFilter}/`))
    ) {
      setMessage({
        type: 'error',
        text: `这里仅能选择${initialFilter === 'image' ? '图片' : initialFilter === 'audio' ? '音频' : '视频'}文件`,
      });
      return;
    }
    try {
      const uploaded = await uploadAssetFiles(files, setUploadProgress);
      onAssetsAdded(uploaded);
      setMessage({
        type: 'success',
        text: `已上传 ${uploaded.length} 个素材${selectionMode ? '，请选择一个使用' : ''}`,
      });
    } catch (error) {
      if (error instanceof AssetBatchUploadError && error.uploadedAssets.length > 0) {
        onAssetsAdded(error.uploadedAssets);
      }
      setMessage({
        type: 'error',
        text:
          error instanceof AssetBatchUploadError && error.uploadedAssets.length > 0
            ? `已保留前 ${error.uploadedAssets.length} 个成功素材；${error.message}`
            : error instanceof Error
              ? error.message
              : '上传失败，请重试',
      });
    } finally {
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (asset: Asset) => {
    const usageCount = getUsageCount(asset.id);
    if (usageCount > 0) {
      setMessage({ type: 'error', text: `该素材仍被 ${usageCount} 个页面使用，请先替换或移除引用` });
      return;
    }
    if (!window.confirm(`确定永久删除“${asset.filename}”吗？此操作无法撤销。`)) return;
    setDeletingId(asset.id);
    setMessage(null);
    try {
      await onDelete(asset);
      setMessage({ type: 'success', text: `已删除“${asset.filename}”` });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '删除失败，请重试',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filters: { id: AssetFilter; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'image', label: '图片' },
    { id: 'audio', label: '音频' },
    { id: 'video', label: '视频' },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files);
        if (files.length === 0) return;
        event.preventDefault();
        event.stopPropagation();
        void handleFiles(files);
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {selectionMode ? '选择现有素材，或上传新文件后使用' : '集中管理当前课件中的图片、音频和视频'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭素材库"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索文件名、说明或类型"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              autoFocus
            />
          </div>
          {initialFilter === 'all' && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filter === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <label
            className={`relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2 ${
              uploadProgress ? 'cursor-wait opacity-60' : ''
            }`}
          >
            <Upload size={15} className="pointer-events-none" />
            <span className="pointer-events-none">上传素材</span>
            <input
              ref={inputRef}
              aria-label="上传素材文件"
              type="file"
              multiple
              disabled={Boolean(uploadProgress)}
              accept={
                initialFilter === 'image'
                  ? 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'
                  : initialFilter === 'audio'
                    ? 'audio/mpeg,audio/wav,audio/ogg'
                    : initialFilter === 'video'
                      ? 'video/mp4,video/webm,video/quicktime,.mov'
                      : ASSET_FILE_ACCEPT
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(event) => {
                if (event.target.files?.length) void handleFiles(event.target.files);
              }}
            />
          </label>
        </div>

        {(message || uploadProgress) && (
          <div className="border-b border-slate-100 px-5 py-3">
            {uploadProgress ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="truncate pr-3">
                    正在上传 {uploadProgress.fileIndex + 1}/{uploadProgress.fileCount}：{uploadProgress.fileName}
                  </span>
                  <span>{uploadProgress.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-800 transition-[width]"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            ) : message ? (
              <div
                className={`flex items-center gap-2 text-sm ${
                  message.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{message.text}</span>
              </div>
            ) : null}
          </div>
        )}

        <div
          className={`relative flex-1 overflow-y-auto p-5 transition ${
            isDragging ? 'bg-blue-50/80' : 'bg-slate-50/50'
          }`}
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              event.stopPropagation();
              setIsDragging(true);
            }
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
            if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
          }}
        >
          {isDragging && (
            <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/90 text-sm font-semibold text-blue-700">
              松开即可上传素材
            </div>
          )}

          {visibleAssets.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleAssets.map((asset) => {
                const usageCount = getUsageCount(asset.id);
                const selected = asset.id === selectedAssetId;
                return (
                  <div
                    key={asset.id}
                    className={`group overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                      selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div
                      role={onSelect ? 'button' : undefined}
                      tabIndex={onSelect ? 0 : undefined}
                      onClick={() => onSelect?.(asset)}
                      onKeyDown={(event) => {
                        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          onSelect(asset);
                        }
                      }}
                      className={`block w-full text-left ${
                        onSelect ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] p-2">
                        <AssetPreview asset={asset} compact />
                      </div>
                      <div className="px-3 pb-2.5 pt-2">
                        <div className="truncate text-sm font-semibold text-slate-800" title={asset.filename}>
                          {asset.filename}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>
                            {assetTypeLabel(asset.type)} · {formatFileSize(asset.size)}
                          </span>
                          {usageCount > 0 && <span className="shrink-0 text-blue-600">使用中 {usageCount}</span>}
                        </div>
                        {asset.type === 'image' && asset.width && asset.height && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            {asset.width} × {asset.height}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                      <span className="truncate pr-2 text-[11px] text-slate-400">{asset.mimeType}</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(asset)}
                        disabled={usageCount > 0 || deletingId === asset.id}
                        title={usageCount > 0 ? '素材仍在课件中使用，不能删除' : '永久删除素材'}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              {filter === 'image' ? (
                <ImageIcon size={38} className="text-slate-300" />
              ) : (
                <Library size={38} className="text-slate-300" />
              )}
              <p className="mt-3 text-sm font-semibold text-slate-600">
                {search ? '没有匹配的素材' : '素材库还是空的'}
              </p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                {search ? '换个关键词，或清空搜索条件' : '点击“上传素材”，也可以将文件直接拖到这里'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
          <span>共 {visibleAssets.length} 个素材</span>
          <span>单个文件最大 100 MB</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
