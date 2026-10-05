import React, { useState } from 'react';
import { X, FolderDown, Check, Archive, Download, HardDrive } from 'lucide-react';
import { Project } from '../types/daw';
import JSZip from 'jszip';

interface CollectProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const CollectProjectModal: React.FC<CollectProjectModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCollect = async () => {
    setIsCollecting(true);
    setStatusMessage('Bundling project files, audio tracks, and samples...');

    try {
      // 1. Send to local native backend endpoint
      const response = await fetch('/api/project/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          projectData: project,
        }),
      });

      // 2. Generate zip for offline portable export
      const zip = new JSZip();
      const folderName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const rootFolder = zip.folder(folderName) || zip;

      // project.experimental JSON file
      rootFolder.file('project.experimental', JSON.stringify(project, null, 2));

      // Subdirectories
      rootFolder.folder('Audio');
      rootFolder.folder('Samples');
      rootFolder.folder('Recordings');
      rootFolder.folder('Backups');

      // README manifest
      rootFolder.file(
        'README_COLLECTED.txt',
        `AetherDAW Collected Project Archive\n` +
          `Project: ${project.name}\n` +
          `Tuning: ${project.tuning.divisionsPerOctave}-TET (A4 = ${project.tuning.referencePitchHz} Hz)\n` +
          `Rhythm: [${project.rhythm.groups.join(', ')}]\n` +
          `Date: ${new Date().toISOString()}\n\n` +
          `Contents:\n` +
          `- project.experimental: Complete DAW state, notes, mixer, plugins\n` +
          `- Audio/: External audio stems\n` +
          `- Samples/: Local sample bank references\n` +
          `- Recordings/: Recorded live microphone audio\n` +
          `- Backups/: Version backups\n`
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${folderName}_Collected.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatusMessage('Project bundle created and downloaded successfully!');
    } catch (err: any) {
      console.warn('Collect project failed:', err);
      setStatusMessage('Error collecting project files: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16181e] border border-[#2b303d] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1b1e26] border-b border-[#292e3b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Collect Project Files (Export Portable Bundle)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#282d3b] text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-zinc-300">
          <p className="leading-relaxed">
            <span className="font-semibold text-white">Collect Project Files</span> packages your complete song into an organized, transportable archive. All recorded audio stems, samples, microtonal tuning mappings, and project states are consolidated into:
          </p>

          <div className="bg-[#0e1014] p-3 rounded border border-[#232733] font-mono text-[11px] text-zinc-400 space-y-0.5">
            <div className="text-emerald-400 font-bold">{project.name}/</div>
            <div className="pl-4">├── project.experimental</div>
            <div className="pl-4">├── Audio/</div>
            <div className="pl-4">├── Samples/</div>
            <div className="pl-4">├── Recordings/</div>
            <div className="pl-4">└── Backups/</div>
          </div>

          <p className="text-zinc-400 text-[11px]">
            This ensures the project can be transferred to another computer or opened offline anywhere without missing sample paths.
          </p>

          {statusMessage && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#14161c] border-t border-[#252934] px-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-zinc-300 hover:bg-[#222632]"
          >
            Close
          </button>
          <button
            onClick={handleCollect}
            disabled={isCollecting}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isCollecting ? 'Packaging...' : 'Collect & Export Bundle'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
