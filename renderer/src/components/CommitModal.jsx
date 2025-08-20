import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

function CommitModal({ 
  isVisible, 
  onClose, 
  folder 
}) {
  // Commit modal state
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitMode, setCommitMode] = useState('existing'); // 'existing' | 'new'
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [isGitRepo, setIsGitRepo] = useState(null);
  const [commitOnCurrent, setCommitOnCurrent] = useState(true);
  
  // Restore local commits UI state
  const [reflogEntries, setReflogEntries] = useState([]);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [hasUpstream, setHasUpstream] = useState(false);
  const [upstreamRef, setUpstreamRef] = useState('');

  // Initialize modal data when it becomes visible
  useEffect(() => {
    if (isVisible && folder) {
      initializeModalData();
    }
  }, [isVisible, folder]);

  async function initializeModalData() {
    if (!folder) return;
    
    setCommitError('');
    setCommitMessage('');
    setCommitMode('existing');
    setNewBranchName('');
    setCommitOnCurrent(true);
    
    try {
      const res = await window.cursovable.getGitBranches({ folderPath: folder });
      if (!res || res.ok === false) {
        setBranches([]);
        setCurrentBranch('');
        setSelectedBranch('');
        setIsGitRepo(false);
      } else {
        setBranches(res.branches || []);
        setCurrentBranch(res.current || '');
        setSelectedBranch(res.current || (res.branches?.[0] || ''));
        setIsGitRepo(!!res.isRepo);
        setHasUpstream(!!res.hasUpstream);
        setUpstreamRef(res.upstreamRef || '');
      }
    } catch (err) {
      console.error('Failed to get git branches:', err);
      setBranches([]);
      setCurrentBranch('');
      setSelectedBranch('');
      setIsGitRepo(false);
    }
    
    try {
      const reflogRes = await window.cursovable.getReflog({ folderPath: folder, limit: 50 });
      if (reflogRes && reflogRes.ok) setReflogEntries(reflogRes.entries || []);
      else setReflogEntries([]);
    } catch { 
      setReflogEntries([]); 
    }
  }

  async function performCommit() {
    if (!folder) return;
    const message = commitMessage.trim();
    if (!message) {
      setCommitError('Enter a commit message');
      return;
    }
    
    // When committing on current branch, do not send mode/branchName so backend stays on current
    const mode = commitOnCurrent ? undefined : commitMode;
    const branchName = commitOnCurrent ? undefined : (commitMode === 'new' ? newBranchName.trim() : selectedBranch.trim());
    
    if (!commitOnCurrent && commitMode === 'new' && !branchName) {
      setCommitError('Enter a new branch name');
      return;
    }
    if (!commitOnCurrent && commitMode === 'existing' && !branchName && isGitRepo) {
      setCommitError('Select a branch');
      return;
    }
    
    setCommitBusy(true);
    setCommitError('');
    
    try {
      const res = await window.cursovable.gitCommit({ 
        folderPath: folder, 
        message, 
        ...(mode ? { mode } : {}), 
        ...(branchName ? { branchName } : {}) 
      });
      
      if (!res || res.ok === false) {
        throw new Error(res?.error || 'Commit failed');
      }
      
      if (res.message === 'No changes to commit') {
        alert('No changes to commit');
      } else {
        const br = res.branch || branchName || currentBranch || 'main';
        alert(`Committed to ${br}`);
      }
      
      onClose();
    } catch (e) {
      setCommitError(e.message || String(e));
    } finally {
      setCommitBusy(false);
    }
  }

  async function handleRestoreCommit(sha) {
    if (!confirm('Reset current branch to this commit? This is destructive and is blocked if the branch tracks a remote.')) return;
    
    setRestoreBusy(true); 
    setRestoreError('');
    
    try {
      const res = await window.cursovable.restoreLocalCommit({ 
        folderPath: folder, 
        action: 'reset-hard', 
        sha: sha 
      });
      
      if (!res || res.ok === false) throw new Error(res?.error || 'Failed');
      
      alert(`Branch ${res.branch || ''} reset to ${sha}`);
      onClose();
    } catch (err) {
      setRestoreError(err.message || String(err));
    } finally { 
      setRestoreBusy(false); 
    }
  }

  async function refreshReflog() {
    try {
      const r = await window.cursovable.getReflog({ folderPath: folder, limit: 50 });
      if (r && r.ok) setReflogEntries(r.entries || []);
    } catch {}
  }

  if (!isVisible) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 600, color: '#cde3ff' }}>Commit Changes</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Back to Chat</Button>
          <Button 
            onClick={performCommit} 
            disabled={
              commitBusy ||
              !commitMessage.trim() ||
              (!commitOnCurrent && (
                (commitMode === 'existing' && !selectedBranch.trim()) ||
                (commitMode === 'new' && !newBranchName.trim())
              ))
            }
          >
            {commitBusy ? 'Committing…' : 'Commit'}
          </Button>
        </div>
      </div>
      
      <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / span 2', fontSize: 12, color: '#c9d5e1' }}>
            {isGitRepo === false ? 'No git repository detected. A repository will be initialized automatically.' : null}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
            <Label>Commit Message</Label>
            <Textarea 
              className="hero-one-line" 
              value={commitMessage} 
              onChange={(e) => setCommitMessage(e.target.value)} 
              placeholder="Describe your changes" 
              rows={3} 
            />
          </div>
          
          <div style={{ gridColumn: '1 / span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0b0f16', border: '1px solid #27354a', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#cde3ff', fontWeight: 600, fontSize: 12 }}>Commit on current branch</div>
              <div style={{ color: '#9ca3af', fontSize: 11 }}>Enable to commit to {currentBranch ? `"${currentBranch}"` : 'the current branch'}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={commitOnCurrent} onChange={(e) => setCommitOnCurrent(e.target.checked)} />
              <span style={{ color: '#cde3ff' }}>{commitOnCurrent ? 'On' : 'Off'}</span>
            </label>
          </div>
          
          {!commitOnCurrent && (
            <>
              <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: 16, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="commit-mode" checked={commitMode==='existing'} onChange={() => setCommitMode('existing')} />
                  <span>Use existing branch</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="commit-mode" checked={commitMode==='new'} onChange={() => setCommitMode('new')} />
                  <span>Create new branch</span>
                </label>
              </div>
              {commitMode === 'existing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
                  <Label>Branch</Label>
                  {branches.length > 0 ? (
                    <Select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                      {branches.map((b) => (
                        <option key={b} value={b}>{b}{currentBranch===b?' (current)':''}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} placeholder="e.g. main" />
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
                  <Label>New Branch Name</Label>
                  <Input value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="feature/my-change" />
                </div>
              )}
            </>
          )}
          
          {commitError && (
            <div style={{ color: '#ef4444', fontSize: 12, gridColumn: '1 / span 2' }}>{commitError}</div>
          )}

          {/* Restore local commits */}
          <div style={{ gridColumn: '1 / span 2', marginTop: 6, borderTop: '1px solid #27354a', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#cde3ff', fontWeight: 600 }}>Restore local commits</div>
            <Button 
              variant="secondary" 
              onClick={() => setShowRestore(v => !v)} 
              disabled={hasUpstream} 
              title={hasUpstream ? `Disabled: current branch tracks ${upstreamRef}` : undefined}
            >
              {showRestore ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showRestore && !hasUpstream && (
            <div style={{ gridColumn: '1 / span 2', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>Select a previous local commit to restore from reflog.</div>
              <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #27354a', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#0b0f16' }}>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>SHA</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>Message</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reflogEntries.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 10, color: '#9ca3af' }}>No entries</td></tr>
                    ) : (
                      reflogEntries.map((e) => (
                        <tr key={e.sha}>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633', fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{e.sha}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633' }}>{e.date}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633' }}>{e.message}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <Button 
                              className="compact" 
                              variant="secondary" 
                              disabled={restoreBusy} 
                              onClick={() => handleRestoreCommit(e.sha)}
                            >
                              Reset
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={refreshReflog}>Refresh</Button>
              </div>
              {restoreError && (
                <div style={{ color: '#ef4444', fontSize: 12 }}>{restoreError}</div>
              )}
            </div>
          )}
          
          {showRestore && hasUpstream && (
            <div style={{ gridColumn: '1 / span 2', padding: 12, border: '1px solid #27354a', borderRadius: 8, background: '#0b0f16', color: '#c9d5e1', fontSize: 12 }}>
              Restore is disabled because the current branch tracks {upstreamRef || 'a remote branch'}. To avoid conflicts with other developers, resetting pushed history is blocked. Create and switch to a local branch with no upstream to enable restore.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommitModal;
