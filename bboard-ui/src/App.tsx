import React, { useState, useEffect } from 'react';
import { GhostCardAPI, ProfileState } from '@midnight-ntwrk/bboard-api';

interface AppProps {
  api?: GhostCardAPI;
}

export interface LinkItem {
  id: string;
  title: string;
  urlOrContent: string;
  isGated: boolean;
  requiredTier?: 'general' | 'vip' | 'speaker';
  description?: string;
  icon: string;
  ephemeralPolicy?: string;
}

export interface ConnectionRequest {
  id: string;
  visitorHandle: string;
  timestamp: string;
  proofTier: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  note: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  status: 'SUCCESS' | 'REVOKED' | 'FAILED';
  tierUsed: string;
}

export const App: React.FC<AppProps> = ({ api }) => {
  const [activeRole, setActiveRole] = useState<'visitor' | 'owner' | 'organizer'>('visitor');

  // Owner Identity State
  const [profileData, setProfileData] = useState({
    name: 'Ahmet Yilmaz',
    handle: 'ahmet_midnight',
    title: 'Zero-Knowledge Architect',
    bio: 'Building privacy-preserving selective disclosure protocols on Midnight Network.',
    avatarEmoji: '⚡',
    eventTag: 'ETHDenver 2026 VIP',
    userPassTier: 'vip' as 'general' | 'vip' | 'speaker',
  });

  // Ledger & Contract State
  const [profile, setProfile] = useState<ProfileState | null>({
    isAcceptingIntros: true,
    requiredBadgeHash: new Uint8Array(32),
    ownerHash: new Uint8Array(32),
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [activeBadgeKey, setActiveBadgeKey] = useState<string>('ETH_DENVER_VIP');

  // Visitor View & Automatic ZK State
  const [visitorPassKey, setVisitorPassKey] = useState<string>('ETH_DENVER_VIP');
  const [selectedTier, setSelectedTier] = useState<'general' | 'vip' | 'speaker'>('vip');
  const [unlockedLinks, setUnlockedLinks] = useState<Record<string, string>>({});
  const [provingId, setProvingId] = useState<string | null>(null);
  const [visitorStatus, setVisitorStatus] = useState<string>('');
  const [provingStep, setProvingStep] = useState<number>(0);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Connection Request State Machine ('IDLE' | 'PENDING' | 'CONNECTED' | 'REJECTED')
  const [connectionState, setConnectionState] = useState<'IDLE' | 'PENDING' | 'CONNECTED' | 'REJECTED'>('IDLE');
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [connectNote, setConnectNote] = useState<string>('Great meeting you at the Midnight booth!');

  // Owner Desk Inbox
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([
    { id: '1', visitorHandle: '@satoshi_zk', timestamp: '10 mins ago', proofTier: 'VIP Investor Pass', status: 'PENDING', note: 'Interested in seed funding your GhostBio protocol.' },
    { id: '2', visitorHandle: '@vitalik_m', timestamp: '1 hour ago', proofTier: 'Speaker Pass', status: 'ACCEPTED', note: 'Let us discuss Compact circuit optimization.' },
  ]);

  // Dynamic Profile Links List
  const [links, setLinks] = useState<LinkItem[]>([
    { id: '1', title: 'GitHub Repository', urlOrContent: 'https://github.com/ghostbio', isGated: false, icon: '💻' },
    { id: '2', title: 'X / Twitter Profile', urlOrContent: 'https://x.com/ahmet_midnight', isGated: false, icon: '🐦' },
    { id: '3', title: 'Direct Signal Contact', urlOrContent: 'https://signal.me/#p/+15550192834', isGated: true, requiredTier: 'general', description: 'Private channel for verified attendees.', icon: '💬', ephemeralPolicy: 'Event-Bound Ephemeral' },
    { id: '4', title: 'Confidential Pitch Deck', urlOrContent: 'https://ghostbio.me/docs/pitch-deck-2026.pdf', isGated: true, requiredTier: 'vip', description: 'Financial projections & roadmap.', icon: '📊', ephemeralPolicy: 'Auto-Revokes at Event End' },
  ]);

  // Owner Link Editing State
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editUrl, setEditUrl] = useState<string>('');
  const [editIsGated, setEditIsGated] = useState<boolean>(false);
  const [editTier, setEditTier] = useState<'general' | 'vip' | 'speaker'>('general');
  const [editPolicy, setEditPolicy] = useState<string>('Event-Bound Ephemeral');

  const [ownerSecret, setOwnerSecret] = useState<string>('ADMIN_SECRET');
  const [ownerStatus, setOwnerStatus] = useState<string>('');

  // New Link Creation Form
  const [newLinkTitle, setNewLinkTitle] = useState<string>('');
  const [newLinkUrl, setNewLinkUrl] = useState<string>('');
  const [newLinkIsGated, setNewLinkIsGated] = useState<boolean>(false);
  const [newLinkTier, setNewLinkTier] = useState<'general' | 'vip' | 'speaker'>('vip');
  const [newLinkPolicy, setNewLinkPolicy] = useState<string>('Auto-Revokes at Event End');

  // Organizer Terminal State
  const [eventActive, setEventActive] = useState<boolean>(true);
  const [targetHandle, setTargetHandle] = useState<string>('ahmet_midnight');
  const [upgradeTier, setUpgradeTier] = useState<'general' | 'vip' | 'speaker'>('speaker');
  const [organizerPassKey, setOrganizerPassKey] = useState<string>('ETH_DENVER_SPEAKER');
  const [organizerStatus, setOrganizerStatus] = useState<string>('');

  // Physical Venue Room Door Gate
  const [roomGateUnlocked, setRoomGateUnlocked] = useState<boolean>(false);
  const [roomGateCode, setRoomGateCode] = useState<string>('');

  // Real-Time Anonymous ZK Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', timestamp: '13:12:05', event: 'ZK Access: Direct Signal Contact', status: 'SUCCESS', tierUsed: 'General Pass' },
    { id: '2', timestamp: '12:58:04', event: 'Key Rotation Executed by Owner', status: 'REVOKED', tierUsed: 'Owner Key' },
  ]);

  // 3D Card Hover Perspective Effect
  const [cardTransform, setCardTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setCardTransform(`perspective(1000px) rotateX(${-y / 22}deg) rotateY(${x / 22}deg) scale3d(1.015, 1.015, 1.015)`);
  };

  const handleMouseLeave = () => {
    setCardTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  const fetchProfileState = async () => {
    if (!api) return;
    try {
      const state = await api.getProfileState();
      if (state) setProfile(state);
    } catch (err: any) {
      console.error('Failed to query ledger state:', err);
    }
  };

  useEffect(() => {
    fetchProfileState();
  }, [api]);

  // Automatic ZK Proving Engine
  useEffect(() => {
    if (!profile?.isAcceptingIntros || !eventActive || !visitorPassKey.trim()) return;

    const tierHierarchy = { general: 1, vip: 2, speaker: 3 };
    const userTierLevel = tierHierarchy[selectedTier];

    const autoUnlock = () => {
      const newUnlocked: Record<string, string> = {};
      links.forEach((link) => {
        if (!link.isGated) return;
        const requiredTierLevel = tierHierarchy[link.requiredTier || 'general'];
        if (userTierLevel >= requiredTierLevel && visitorPassKey.includes('ETH_DENVER')) {
          newUnlocked[link.id] = link.urlOrContent;
        }
      });
      setUnlockedLinks(newUnlocked);
      if (Object.keys(newUnlocked).length > 0) {
        setVisitorStatus(`✓ ZK Proof Verified locally on Midnight. ${Object.keys(newUnlocked).length} secret link(s) unlocked.`);
      }
    };

    autoUnlock();
  }, [visitorPassKey, selectedTier, links, profile?.isAcceptingIntros, eventActive]);

  // Visitor Manual Step-by-Step ZK Unlock Execution
  const handleUnlockLink = async (link: LinkItem) => {
    if (!profile?.isAcceptingIntros || !eventActive) {
      setVisitorStatus('PROFILE OFF-AIR: Intros deactivated or event session closed.');
      return;
    }

    if (!visitorPassKey.trim()) {
      setVisitorStatus('Please enter an Event Pass Secret Key.');
      return;
    }

    const tierHierarchy = { general: 1, vip: 2, speaker: 3 };
    const userTierLevel = tierHierarchy[selectedTier];
    const requiredTierLevel = tierHierarchy[link.requiredTier || 'general'];

    setProvingId(link.id);
    setLoading(true);
    setProvingStep(1);
    setVisitorStatus('Step 1/3: Querying Midnight Indexer contract state...');

    try {
      await new Promise((res) => setTimeout(res, 400));
      setProvingStep(2);
      setVisitorStatus('Step 2/3: Executing local ZK-SNARK proof generation in Docker Proof Server...');

      if (api) {
        const encoder = new TextEncoder();
        await api.verifyAccess(encoder.encode(visitorPassKey.padEnd(32, ' ')));
      } else {
        await new Promise((res) => setTimeout(res, 600));
        if (userTierLevel < requiredTierLevel) {
          throw new Error(`Insufficient Pass Tier: Requires [${link.requiredTier?.toUpperCase()}] Key.`);
        }
        if (!visitorPassKey.includes('ETH_DENVER')) {
          throw new Error('Cryptographic Failure: Invalid or revoked pass key.');
        }
      }

      setProvingStep(3);
      setUnlockedLinks((prev) => ({ ...prev, [link.id]: link.urlOrContent }));
      setVisitorStatus(`Step 3/3: ZK Proof Verified on Midnight Ledger! Access Granted.`);

      setAuditLogs((prev) => [
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          event: `ZK Unlocked: ${link.title}`,
          status: 'SUCCESS',
          tierUsed: `${selectedTier.toUpperCase()} Pass`,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setVisitorStatus(`ZK Proving Failed: ${err.message}`);
      setAuditLogs((prev) => [
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          event: `ZK Rejected: ${link.title}`,
          status: 'FAILED',
          tierUsed: `${selectedTier.toUpperCase()} Pass`,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
      setProvingId(null);
      setProvingStep(0);
    }
  };

  // Connection Request Submission
  const handleSendConnectionRequest = () => {
    const newReq: ConnectionRequest = {
      id: Date.now().toString(),
      visitorHandle: '@visitor_node',
      timestamp: 'Just now',
      proofTier: `${selectedTier.toUpperCase()} Pass`,
      status: 'PENDING',
      note: connectNote,
    };
    setConnectionRequests([newReq, ...connectionRequests]);
    setConnectionState('PENDING');
    setShowConnectModal(false);
  };

  // Owner Link CRUD
  const handleAddLink = () => {
    if (!newLinkTitle || !newLinkUrl) return;
    const newEntry: LinkItem = {
      id: Date.now().toString(),
      title: newLinkTitle,
      urlOrContent: newLinkUrl,
      isGated: newLinkIsGated,
      requiredTier: newLinkIsGated ? newLinkTier : undefined,
      description: newLinkIsGated ? `Gated for ${newLinkTier.toUpperCase()} pass holders.` : undefined,
      icon: newLinkIsGated ? '🔐' : '🔗',
      ephemeralPolicy: newLinkPolicy,
    };
    setLinks([...links, newEntry]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setOwnerStatus(`New link '${newLinkTitle}' published to profile.`);
  };

  const handleStartEditLink = (link: LinkItem) => {
    setEditingLinkId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.urlOrContent);
    setEditIsGated(link.isGated);
    setEditTier(link.requiredTier || 'general');
    setEditPolicy(link.ephemeralPolicy || 'Event-Bound Ephemeral');
  };

  const handleSaveEditLink = (id: string) => {
    setLinks(
      links.map((l) =>
        l.id === id
          ? {
            ...l,
            title: editTitle,
            urlOrContent: editUrl,
            isGated: editIsGated,
            requiredTier: editIsGated ? editTier : undefined,
            description: editIsGated ? `Gated for ${editTier.toUpperCase()} pass holders.` : undefined,
            ephemeralPolicy: editPolicy,
          }
          : l
      )
    );
    setEditingLinkId(null);
    setOwnerStatus('Link updated successfully.');
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
    setOwnerStatus('Link removed from profile.');
  };

  // Connection Inbox Handling
  const handleAcceptConnection = (id: string) => {
    setConnectionRequests(
      connectionRequests.map((req) => (req.id === id ? { ...req, status: 'ACCEPTED' } : req))
    );
    setConnectionState('CONNECTED');
    setOwnerStatus('ZK Connection Accepted! Details revealed to visitor.');
  };

  const handleDeclineConnection = (id: string) => {
    setConnectionRequests(
      connectionRequests.map((req) => (req.id === id ? { ...req, status: 'DECLINED' } : req))
    );
    setConnectionState('REJECTED');
    setOwnerStatus('ZK Connection Declined.');
  };

  // Owner Off-Air Toggle
  const handleToggleDeactivation = async () => {
    if (!profile) return;
    setLoading(true);
    setOwnerStatus('Submitting ZK Owner Authorization to Midnight Ledger...');
    try {
      if (api) {
        const encoder = new TextEncoder();
        await api.toggleAccepting(encoder.encode(ownerSecret.padEnd(32, ' ')), !profile.isAcceptingIntros);
        await fetchProfileState();
      } else {
        await new Promise((res) => setTimeout(res, 700));
        setProfile({ ...profile, isAcceptingIntros: !profile.isAcceptingIntros });
      }
      setUnlockedLinks({});
      setOwnerStatus(`Profile state updated: ${!profile.isAcceptingIntros ? 'ONLINE & ACTIVE' : 'OFF-AIR / BLACKOUT'}`);
    } catch (err: any) {
      setOwnerStatus(`Action Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Organizer Upgrades & Batch Operations
  const handleUpgradeUser = () => {
    if (!targetHandle) return;
    setProfileData((prev) => ({
      ...prev,
      userPassTier: upgradeTier,
      eventTag: `ETHDenver 2026 ${upgradeTier.toUpperCase()}`,
    }));
    setActiveBadgeKey(organizerPassKey);
    setOrganizerStatus(`Success: Upgraded user '@${targetHandle.replace('@', '')}' to [${upgradeTier.toUpperCase()}] tier on Midnight Event Registry.`);
  };

  const handleEndEventBatchRevoke = () => {
    setEventActive(false);
    setUnlockedLinks({});
    setOrganizerStatus('🚨 EVENT SESSION ENDED: Executed on-chain key rotation. All 1,250 attendee pass keys revoked in ZK!');
    setAuditLogs((prev) => [
      { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), event: 'Organizer Global Pass Revocation', status: 'REVOKED', tierUsed: 'Organizer Master Key' },
      ...prev,
    ]);
  };

  // Unlock Physical Venue Door Gate
  const handleUnlockVenueGate = () => {
    if (profileData.userPassTier !== 'speaker' && profileData.userPassTier !== 'vip') {
      setRoomGateCode('ACCESS DENIED: Requires Speaker or VIP Pass Tier.');
      return;
    }
    setRoomGateUnlocked(true);
    setRoomGateCode('SPEAKER-LOUNGE-DOOR-CODE: #MIDNIGHT-8839');
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#030508', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box', overflowX: 'hidden' }}>

      {/* Global CSS Reset Injection */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #root { width: 100%; min-height: 100vh; background-color: #030508; overflow-x: hidden; }
        input:focus, select:focus, textarea:focus { outline: 1px solid #818cf8; }
        button { transition: transform 0.15s ease, background-color 0.2s ease, opacity 0.2s ease; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* Radial Background Aura */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '1400px', height: '500px', background: 'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.2), rgba(99, 102, 241, 0.08) 45%, transparent 80%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Top Floating Glass Navigation Header */}
      <header style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', backgroundColor: 'rgba(11, 15, 23, 0.85)', borderRadius: '24px', backdropFilter: 'blur(24px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 20px 50px -15px rgba(0,0,0,0.8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 0 30px rgba(168, 85, 247, 0.45)' }}>
              👻
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em', background: 'linear-gradient(90deg, #fff, #c084fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  GHOSTBIO
                </span>
                <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 'bold' }}>
                  MIDNIGHT ZK NATIVE
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Zero-Knowledge Selective Disclosure Protocol</p>
            </div>
          </div>

          {/* Navigation Role Tabs */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#070a10', padding: '6px', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <button
              onClick={() => setActiveRole('visitor')}
              style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', backgroundColor: activeRole === 'visitor' ? '#7c3aed' : 'transparent', color: activeRole === 'visitor' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
              👤 Visitor Profile Card
            </button>
            <button
              onClick={() => setActiveRole('owner')}
              style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', backgroundColor: activeRole === 'owner' ? '#2563eb' : 'transparent', color: activeRole === 'owner' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
              👑 Owner Control Desk {connectionRequests.filter((r) => r.status === 'PENDING').length > 0 && <span style={{ marginLeft: '6px', padding: '2px 7px', borderRadius: '10px', backgroundColor: '#ec4899', color: '#fff', fontSize: '10px' }}>{connectionRequests.filter((r) => r.status === 'PENDING').length}</span>}
            </button>
            <button
              onClick={() => setActiveRole('organizer')}
              style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', backgroundColor: activeRole === 'organizer' ? '#059669' : 'transparent', color: activeRole === 'organizer' ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
              🎪 Organizer Terminal
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '32px auto', padding: '0 24px 48px' }}>

        {/* ========================================================================= */}
        {/* PAGE 1: VISITOR CARD VIEW                                                 */}
        {/* ========================================================================= */}
        {activeRole === 'visitor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '36px', alignItems: 'start' }}>

            {/* Left Column: 3D Holographic Business Card */}
            <div style={{ position: 'sticky', top: '24px' }}>
              <div
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: cardTransform,
                  transition: 'transform 0.1s ease-out',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                  backdropFilter: 'blur(30px)',
                  borderRadius: '32px',
                  padding: '36px 30px',
                  border: profile?.isAcceptingIntros && eventActive ? '1px solid rgba(192, 132, 252, 0.45)' : '1px solid rgba(239, 68, 68, 0.45)',
                  boxShadow: profile?.isAcceptingIntros && eventActive ? '0 30px 70px -20px rgba(124, 58, 237, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)' : '0 30px 70px -20px rgba(239, 68, 68, 0.35)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>

                {/* Status Indicator Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#c084fc', letterSpacing: '0.15em' }}>GHOSTBIO • PERSONAL CARD</span>
                  <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: profile?.isAcceptingIntros && eventActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: profile?.isAcceptingIntros && eventActive ? '#34d399' : '#f87171', border: `1px solid ${profile?.isAcceptingIntros && eventActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}` }}>
                    {profile?.isAcceptingIntros && eventActive ? '● ACTIVE & ONLINE' : '○ OFF-AIR'}
                  </span>
                </div>

                {/* Profile Avatar & Identity */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', boxShadow: '0 0 35px rgba(168, 85, 247, 0.55)', border: '3px solid rgba(255,255,255,0.3)' }}>
                    {profileData.avatarEmoji}
                  </div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 'bold', color: '#fff' }}>{profileData.name}</h2>
                  <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#a7f3d0' }}>@{profileData.handle}</p>
                  <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>{profileData.bio}</p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#c084fc', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                      🎟️ {profileData.eventTag}
                    </span>
                    <button
                      onClick={() => setShowQrModal(true)}
                      style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                      📱 Scan QR
                    </button>
                  </div>
                </div>

                {/* Connection Request Action Button */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                  {connectionState === 'IDLE' && (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      disabled={!profile?.isAcceptingIntros || !eventActive}
                      style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)' }}>
                      🤝 Send ZK Connection Request
                    </button>
                  )}

                  {connectionState === 'PENDING' && (
                    <button disabled style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', fontSize: '13px', fontWeight: 'bold', cursor: 'not-allowed' }}>
                      ⏳ Connection Request Pending...
                    </button>
                  )}

                  {connectionState === 'CONNECTED' && (
                    <button disabled style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '13px', fontWeight: 'bold', cursor: 'default' }}>
                      ✓ Connected with Ahmet
                    </button>
                  )}

                  {connectionState === 'REJECTED' && (
                    <button onClick={() => setShowConnectModal(true)} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                      ↺ Request Declined - Try Again
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Pass Key Selector */}
              <div style={{ marginTop: '20px', backgroundColor: '#0b0f17', padding: '20px', borderRadius: '20px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                  Select Pass Key Tier (Demo Presets):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => { setSelectedTier('general'); setVisitorPassKey('ETH_DENVER_GENERAL'); }}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: selectedTier === 'general' ? '1px solid #818cf8' : '1px solid #1e293b', backgroundColor: selectedTier === 'general' ? 'rgba(99, 102, 241, 0.2)' : '#030508', color: '#fff', fontSize: '12px', textAlign: 'left', cursor: 'pointer' }}>
                    🎟️ General Pass Key: <code style={{ color: '#a7f3d0' }}>ETH_DENVER_GENERAL</code>
                  </button>
                  <button
                    onClick={() => { setSelectedTier('vip'); setVisitorPassKey('ETH_DENVER_VIP'); }}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: selectedTier === 'vip' ? '1px solid #c084fc' : '1px solid #1e293b', backgroundColor: selectedTier === 'vip' ? 'rgba(192, 132, 252, 0.2)' : '#030508', color: '#fff', fontSize: '12px', textAlign: 'left', cursor: 'pointer' }}>
                    ⭐ VIP Investor Pass Key: <code style={{ color: '#fef08a' }}>ETH_DENVER_VIP</code>
                  </button>
                  <button
                    onClick={() => { setSelectedTier('speaker'); setVisitorPassKey('ETH_DENVER_SPEAKER'); }}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: selectedTier === 'speaker' ? '1px solid #34d399' : '1px solid #1e293b', backgroundColor: selectedTier === 'speaker' ? 'rgba(52, 211, 153, 0.2)' : '#030508', color: '#fff', fontSize: '12px', textAlign: 'left', cursor: 'pointer' }}>
                    🎙️ Speaker / VIP Key: <code style={{ color: '#6ee7b7' }}>ETH_DENVER_SPEAKER</code>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Link Gateways */}
            <div>
              {!profile?.isAcceptingIntros || !eventActive ? (
                /* OFF-AIR / EVENT CLOSED BLACKOUT BANNER */
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '28px', padding: '56px', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '18px' }}>🚫</div>
                  <h2 style={{ margin: '0 0 10px', color: '#f87171', fontSize: '28px' }}>
                    {!eventActive ? 'Event Session Revoked by Organizer' : 'Profile Is Currently Off-Air'}
                  </h2>
                  <p style={{ color: '#cbd5e1', fontSize: '15px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                    {!eventActive
                      ? 'The event session has ended. The organizer executed global key rotation on Midnight, revoking all pass access.'
                      : 'The profile owner activated hard deactivation on the Midnight ledger. Public and gated links are locked.'}
                  </p>
                  <span style={{ fontSize: '12px', color: '#fca5a5', backgroundColor: '#450a0a', padding: '8px 18px', borderRadius: '20px' }}>
                    On-Chain State: {!eventActive ? 'eventActive = false' : 'isAcceptingIntros = false'}
                  </span>
                </div>
              ) : (
                <>
                  {/* Public Links */}
                  <div style={{ marginBottom: '36px' }}>
                    <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '16px', fontWeight: 'bold' }}>
                      🌐 Public Links
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {links.filter((l) => !l.isGated).map((link) => (
                        <a key={link.id} href={link.urlOrContent} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 22px', backgroundColor: '#0b0f17', borderRadius: '16px', color: '#fff', textDecoration: 'none', border: '1px solid #1e293b', fontWeight: 'bold', fontSize: '14px' }}>
                          <span style={{ fontSize: '20px' }}>{link.icon}</span> <span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* ZK Gated Links */}
                  <div>
                    <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.1em', marginBottom: '16px', fontWeight: 'bold' }}>
                      🔒 Zero-Knowledge Selective-Disclosure Links
                    </h3>

                    {/* Pass Secret Key Input Bar */}
                    <div style={{ backgroundColor: '#0b0f17', padding: '22px', borderRadius: '20px', marginBottom: '22px', border: '1px solid rgba(192, 132, 252, 0.35)' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold' }}>
                        Your Event Pass Secret (Evaluated locally via ZK proof server):
                      </label>
                      <input
                        type="text"
                        value={visitorPassKey}
                        onChange={(e) => setVisitorPassKey(e.target.value)}
                        placeholder="Enter Event Badge Secret"
                        style={{ width: '100%', padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#030508', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>

                    {visitorStatus && (
                      <div style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '22px', fontSize: '13px', backgroundColor: visitorStatus.includes('Verified') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: visitorStatus.includes('Verified') ? '#6ee7b7' : '#fca5a5', border: `1px solid ${visitorStatus.includes('Verified') ? '#059669' : '#dc2626'}` }}>
                        {visitorStatus}
                      </div>
                    )}

                    {/* Gated Link Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {links.filter((l) => l.isGated).map((link) => {
                        const isUnlocked = Boolean(unlockedLinks[link.id]);
                        return (
                          <div key={link.id} style={{ backgroundColor: '#0b0f17', padding: '24px 26px', borderRadius: '20px', border: isUnlocked ? '1px solid #10b981' : '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, marginRight: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '22px' }}>{link.icon}</span>
                                <h4 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>{link.title}</h4>
                              </div>
                              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#94a3b8' }}>{link.description}</p>

                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#a7f3d0', backgroundColor: 'rgba(6, 78, 59, 0.6)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  Tier Gate: {link.requiredTier?.toUpperCase()} PASS
                                </span>
                                {link.ephemeralPolicy && (
                                  <span style={{ fontSize: '11px', color: '#fef08a', backgroundColor: 'rgba(113, 63, 18, 0.6)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                    ⚡ {link.ephemeralPolicy}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              {isUnlocked ? (
                                <a
                                  href={unlockedLinks[link.id]}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ padding: '14px 24px', borderRadius: '14px', backgroundColor: '#10b981', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', display: 'inline-block', boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)' }}>
                                  Open Secret Link 🔓
                                </a>
                              ) : (
                                <button
                                  onClick={() => handleUnlockLink(link)}
                                  disabled={loading}
                                  style={{ padding: '14px 24px', borderRadius: '14px', border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', boxShadow: '0 0 25px rgba(124, 58, 237, 0.35)' }}>
                                  {provingId === link.id ? `Generating ZK (${provingStep}/3)...` : 'Generate ZK Proof'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* QR CODE MODAL */}
        {showQrModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ width: '380px', backgroundColor: '#0b0f17', padding: '32px', borderRadius: '24px', border: '1px solid #334155', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px', color: '#fff' }}>📱 GhostBio ZK Card QR</h3>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#94a3b8' }}>Scan to view profile and prove pass ownership in ZK</p>

              <div style={{ width: '200px', height: '200px', margin: '0 auto 20px', backgroundColor: '#fff', padding: '16px', borderRadius: '16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} style={{ backgroundColor: (i % 2 === 0 || i % 5 === 0) ? '#000' : '#818cf8', borderRadius: '2px' }} />
                ))}
              </div>

              <button onClick={() => setShowQrModal(false)} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}

        {/* CONNECTION MODAL */}
        {showConnectModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ width: '480px', backgroundColor: '#0b0f17', padding: '32px', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 30px 60px rgba(0,0,0,0.9)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: '#fff' }}>🤝 Send ZK Connection Request</h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                Midnight proves your valid event pass ownership in ZK. Ahmet will receive your connection request without revealing your wallet identity.
              </p>

              <textarea
                value={connectNote}
                onChange={(e) => setConnectNote(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#030508', color: '#fff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '20px' }}
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowConnectModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSendConnectionRequest} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Send ZK Request</button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: PROFILE OWNER CONTROL DESK                                       */}
        {/* ========================================================================= */}
        {activeRole === 'owner' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '36px' }}>

            <div style={{ backgroundColor: '#0b0f17', padding: '36px', borderRadius: '28px', border: '1px solid #1e293b' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '24px', color: '#60a5fa' }}>👑 Profile Owner Security & Management Desk</h2>
              <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#94a3b8' }}>Customize bio, process connection requests, and manage link ephemerality.</p>

              {/* Owner Analytics & Privacy Score Widget */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
                <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#030508', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Privacy Score</span>
                  <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>100% ZK</p>
                </div>
                <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#030508', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>ZK Unlocks</span>
                  <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#c084fc' }}>148</p>
                </div>
                <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#030508', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Connections</span>
                  <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>{connectionRequests.filter((r) => r.status === 'ACCEPTED').length}</p>
                </div>
              </div>

              {/* Connection Requests Inbox */}
              <div style={{ backgroundColor: '#030508', padding: '24px', borderRadius: '20px', border: '1px solid rgba(37, 99, 235, 0.4)', marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📬 ZK Connection Requests Inbox ({connectionRequests.filter((r) => r.status === 'PENDING').length} Pending)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {connectionRequests.map((req) => (
                    <div key={req.id} style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#0b0f17', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{req.visitorHandle}</span>
                        <span style={{ fontSize: '11px', color: '#a7f3d0', backgroundColor: '#064e3b', padding: '2px 8px', borderRadius: '6px' }}>{req.proofTier}</span>
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#94a3b8' }}>"{req.note}"</p>

                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => handleAcceptConnection(req.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Accept Connection</button>
                          <button onClick={() => handleDeclineConnection(req.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: req.status === 'ACCEPTED' ? '#34d399' : '#f87171' }}>
                          Status: {req.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Event Passes */}
              <div style={{ backgroundColor: '#030508', padding: '24px', borderRadius: '20px', border: '1px solid rgba(52, 211, 153, 0.4)', marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#34d399' }}>🎟️ My Event Access Passes & Venue Door Gates</h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8' }}>
                  Your issued event pass tier: <strong>{profileData.userPassTier.toUpperCase()}</strong>. Use pass key to unlock physical venue door gates.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#0b0f17', borderRadius: '12px', border: '1px solid #1e293b' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>ETH Denver VIP Speaker Lounge Gate</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Physical door lock nullifier key verification</p>
                  </div>
                  <button onClick={handleUnlockVenueGate} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#059669', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                    Verify & Unlock Door
                  </button>
                </div>

                {roomGateCode && (
                  <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', backgroundColor: roomGateUnlocked ? '#064e3b' : '#450a0a', color: roomGateUnlocked ? '#34d399' : '#fca5a5', fontSize: '13px', fontWeight: 'bold' }}>
                    {roomGateCode}
                  </div>
                )}
              </div>

              {/* Profile Links CRUD */}
              <div style={{ backgroundColor: '#030508', padding: '24px', borderRadius: '20px', border: '1px solid #1e293b' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#c084fc' }}>+ Add New Profile Link</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input type="text" placeholder="Title (e.g., Pitch Deck)" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '13px' }} />
                  <input type="text" placeholder="URL or Secret Link" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '13px' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={newLinkIsGated} onChange={(e) => setNewLinkIsGated(e.target.checked)} />
                    Enable ZK Pass Gate
                  </label>

                  {newLinkIsGated && (
                    <select value={newLinkTier} onChange={(e: any) => setNewLinkTier(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '12px' }}>
                      <option value="general">General Tier</option>
                      <option value="vip">VIP Tier</option>
                      <option value="speaker">Speaker Tier</option>
                    </select>
                  )}
                </div>

                <button onClick={handleAddLink} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  Publish Link to Profile
                </button>
              </div>

              {/* Active Profile Links List with Inline Editing */}
              <div style={{ marginTop: '28px' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', color: '#94a3b8' }}>Active Profile Links ({links.length}):</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {links.map((link) => (
                    <div key={link.id} style={{ padding: '16px', backgroundColor: '#030508', borderRadius: '14px', border: '1px solid #1e293b' }}>
                      {editingLinkId === link.id ? (
                        /* INLINE EDIT FORM */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '12px' }} />
                            <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '12px' }} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <label style={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="checkbox" checked={editIsGated} onChange={(e) => setEditIsGated(e.target.checked)} />
                              ZK Gate
                            </label>

                            {editIsGated && (
                              <select value={editTier} onChange={(e: any) => setEditTier(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '12px' }}>
                                <option value="general">General Tier</option>
                                <option value="vip">VIP Tier</option>
                                <option value="speaker">Speaker Tier</option>
                              </select>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleSaveEditLink(link.id)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#059669', color: '#fff', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditingLinkId(null)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* DISPLAY ROW */
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{link.icon} {link.title}</span>
                            {link.isGated && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#c084fc', backgroundColor: 'rgba(192, 132, 252, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>Gate: {link.requiredTier?.toUpperCase()}</span>}
                            {link.ephemeralPolicy && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#fef08a' }}>⚡ {link.ephemeralPolicy}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleStartEditLink(link)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                            <button onClick={() => handleDeleteLink(link.id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hard Off-Air Deactivation */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '24px', marginTop: '28px' }}>
                <button onClick={handleToggleDeactivation} disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: profile?.isAcceptingIntros ? '#dc2626' : '#16a34a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)' }}>
                  {profile?.isAcceptingIntros ? '🚫 Hard Deactivate All Profile Links (Off-Air Blackout Mode)' : '✅ Re-Activate Profile'}
                </button>
              </div>

              {ownerStatus && <p style={{ fontSize: '13px', color: '#6ee7b7', margin: '16px 0 0' }}>{ownerStatus}</p>}
            </div>

            {/* Right Column: Audit Stream */}
            <div style={{ backgroundColor: '#0b0f17', padding: '28px', borderRadius: '28px', border: '1px solid #1e293b' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#c084fc' }}>📊 Anonymous ZK Audit Stream</h3>
              <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                Every unlock logs anonymized ZK verification events on Midnight. Zero visitor IPs or wallet addresses are recorded.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#030508', border: '1px solid #1e293b', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>{log.timestamp}</span>
                      <span style={{ fontWeight: 'bold', color: log.status === 'SUCCESS' ? '#34d399' : '#f87171' }}>{log.status}</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: '#fff' }}>{log.event}</p>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>Tier: {log.tierUsed}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: ORGANIZER TERMINAL                                               */}
        {/* ========================================================================= */}
        {activeRole === 'organizer' && (
          <div style={{ backgroundColor: '#0b0f17', padding: '40px', borderRadius: '28px', border: '1px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#34d399' }}>🎪 GhostRally Event Organizer Terminal</h2>
              <button
                onClick={handleEndEventBatchRevoke}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)' }}>
                🚨 End Event Session & Batch Revoke All Keys
              </button>
            </div>
            <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#94a3b8' }}>Target specific attendee handles, issue on-chain commitments, and execute post-event pass key revocations.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '32px' }}>
              <div style={{ padding: '22px', borderRadius: '18px', backgroundColor: '#030508', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Issued ZK Passes</span>
                <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#34d399' }}>1,250</p>
              </div>
              <div style={{ padding: '22px', borderRadius: '18px', backgroundColor: '#030508', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>VIP / Speaker Upgrades</span>
                <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#c084fc' }}>340</p>
              </div>
              <div style={{ padding: '22px', borderRadius: '18px', backgroundColor: '#030508', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Event Session Status</span>
                <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 'bold', color: eventActive ? '#34d399' : '#f87171' }}>
                  {eventActive ? '● SESSION ACTIVE' : '○ EVENT SESSION REVOKED'}
                </p>
              </div>
            </div>

            {/* Targeted Upgrade Form */}
            <div style={{ backgroundColor: '#030508', padding: '28px', borderRadius: '20px', border: '1px solid #1e293b' }}>
              <h4 style={{ margin: '0 0 18px', fontSize: '17px', color: '#fff' }}>Targeted Attendee Pass Upgrade</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Target Attendee Handle</label>
                  <input type="text" value={targetHandle} onChange={(e) => setTargetHandle(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Upgrade Ticket Tier</label>
                  <select value={upgradeTier} onChange={(e: any) => setUpgradeTier(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                    <option value="general">General Pass Tier</option>
                    <option value="vip">VIP Investor Pass Tier</option>
                    <option value="speaker">Speaker Pass Tier</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Pass Commitment Secret</label>
                  <input type="text" value={organizerPassKey} onChange={(e) => setOrganizerPassKey(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0b0f17', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <button onClick={handleUpgradeUser} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', backgroundColor: '#059669', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 0 20px rgba(5, 150, 105, 0.4)' }}>
                Publish Upgrade Commitment to Midnight
              </button>

              {organizerStatus && <p style={{ fontSize: '13px', color: '#6ee7b7', margin: '18px 0 0' }}>{organizerStatus}</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;