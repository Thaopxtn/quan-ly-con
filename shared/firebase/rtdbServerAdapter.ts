/**
 * RTDB Server Adapter
 * 
 * Replaces Firebase Realtime Database SDK with seamless communication to
 * the local Node.js server (server.cjs) via REST API and Server-Sent Events (SSE).
 * 
 * Zero Firebase Realtime Database bandwidth or quota is consumed.
 */

import { serverApiClient } from "../services/serverApiClient";

export class ServerRtdbRef {
  public path: string;
  public key: string;

  constructor(path: string) {
    this.path = path.replace(/^\/+|\/+$/g, "");
    const parts = this.path.split("/");
    this.key = parts[parts.length - 1] || "root";
  }
}

export function rtdbRef(_rtdb: any, path: string): ServerRtdbRef {
  return new ServerRtdbRef(path);
}

export function rtdbPush(ref: ServerRtdbRef, value?: any): ServerRtdbRef & PromiseLike<ServerRtdbRef> {
  const newKey = "item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const newRef = new ServerRtdbRef(`${ref.path}/${newKey}`);
  const thenable = {
    ...newRef,
    key: newKey,
    path: newRef.path,
    then: (resolve?: (val: ServerRtdbRef) => any, reject?: (err: any) => any) => {
      const p = value !== undefined ? routeWriteToServer(newRef.path, value) : Promise.resolve();
      return p.then(() => (resolve ? resolve(newRef) : newRef), reject);
    },
  };
  return thenable as any;
}

/**
 * Extracts childId from various path conventions:
 * - pairings/sync/{syncKey}/...
 * - users/{parentId}/children/{childId}/...
 */
function extractChildId(path: string): string {
  const parts = path.split("/");
  // Format: pairings/sync/{parentId}___{childId}/... or legacy {parentId}_{childId}
  const syncIdx = parts.indexOf("sync");
  if (syncIdx >= 0 && parts[syncIdx + 1]) {
    const syncKey = parts[syncIdx + 1];
    if (syncKey.includes("___")) {
      return syncKey.split("___")[1] || "";
    }
    const keyParts = syncKey.split("_");
    if (keyParts.length >= 2) {
      return keyParts.slice(1).join("_");
    }
    return syncKey;
  }
  // Format: users/{parentId}/children/{childId}/...
  const childIdx = parts.indexOf("children");
  if (childIdx >= 0 && parts[childIdx + 1]) {
    return parts[childIdx + 1];
  }
  // Format: pairings/active_children/{childId}
  const activeIdx = parts.indexOf("active_children");
  if (activeIdx >= 0 && parts[activeIdx + 1]) {
    return parts[activeIdx + 1];
  }
  return "";
}

/**
 * Extracts parentId from path conventions
 */
function extractParentId(path: string): string {
  const parts = path.split("/");
  const userIdx = parts.indexOf("users");
  if (userIdx >= 0 && parts[userIdx + 1]) {
    return parts[userIdx + 1];
  }
  const syncIdx = parts.indexOf("sync");
  if (syncIdx >= 0 && parts[syncIdx + 1]) {
    const syncKey = parts[syncIdx + 1];
    if (syncKey.includes("___")) {
      return syncKey.split("___")[0] || "family_primary";
    }
    const keyParts = syncKey.split("_");
    return keyParts[0] || "family_primary";
  }
  const famIdx = parts.indexOf("families");
  if (famIdx >= 0 && parts[famIdx + 1]) {
    return parts[famIdx + 1];
  }
  return "family_primary";
}

/**
 * Route RTDB writes (set/update) to the appropriate local server REST endpoints
 */
async function routeWriteToServer(path: string, data: any): Promise<void> {
  const p = path.toLowerCase();

  // Ignore legacy authenticated mirror writes under users/ to prevent duplicate requests
  if (p.startsWith("users/")) {
    return;
  }

  const childId = extractChildId(path) || data?.childId || "";
  const parentId = extractParentId(path) || data?.parentId || "family_primary";

  // 1. Settings
  if (p.includes("/settings")) {
    if (childId) {
      await serverApiClient.saveChildSettings(childId, data, parentId);
      return;
    }
  }

  // 2. Stars
  if (p.includes("/stars")) {
    if (childId) {
      const stars = typeof data === "number" ? data : (data?.stars ?? 0);
      await serverApiClient.saveChildStars(childId, stars, data?.transaction, parentId);
      return;
    }
  }

  // 3. Telemetry (Only the main telemetry endpoint, not /devices/ mirror)
  if (p.endsWith("/telemetry")) {
    await serverApiClient.uploadTelemetry({ ...data, childId, parentId });
    return;
  }

  // 4. Route points
  if (p.includes("/routehistory")) {
    await serverApiClient.uploadTelemetry({ ...data, childId, parentId, type: "route" });
    return;
  }

  // 5. SOS
  if (p.includes("/sos")) {
    if (data && data.active === false) {
      if (childId) await serverApiClient.resolveSos(childId);
    } else {
      await serverApiClient.triggerSos({ ...data, childId, parentId });
    }
    return;
  }

  // 6. Commands
  if (p.includes("/commands/active") || p.includes("/pc_commands/active")) {
    if (data && data.command && data.command !== "none") {
      await serverApiClient.sendCommand({ ...data, childId, parentId });
    }
    return;
  }

  // 7. Command ACK
  if (p.includes("/commands/lastack")) {
    await serverApiClient.sendCommandAck({ ...data, childId, parentId });
    return;
  }

  // 8. Time Requests
  if (p.includes("/time_requests")) {
    if (data && data.status && data.status !== "pending" && data.id) {
      await serverApiClient.resolveTimeRequest(data.id, childId, data.status, data.approvedMinutes);
    } else if (data) {
      await serverApiClient.sendTimeRequest({ ...data, childId, parentId });
    }
    return;
  }

  // 9. Chat
  if (p.includes("/chat_messages")) {
    await serverApiClient.sendChatMessage({ ...data, childId, parentId });
    return;
  }

  // 10. Children Registry
  if (p.includes("/children") || p.includes("/active_children")) {
    if (data && (data.id || childId)) {
      await serverApiClient.saveChildProfile(parentId, { ...data, id: data.id || childId });
    }
    return;
  }

  // 11. Safe Zones
  if (p.includes("/safezones")) {
    const zones = Array.isArray(data) ? data : (data?.safeZones || []);
    await serverApiClient.saveSafeZones(childId || parentId, zones);
    return;
  }

  // 12. PC Control
  if (p.includes("/pcconfig")) {
    if (childId) await serverApiClient.savePcConfig(childId, data);
    return;
  }
  if (p.includes("/pctelemetry")) {
    if (childId) await serverApiClient.uploadPcTelemetry(childId, data);
    return;
  }

  // 13. Live Tracking
  if (p.includes("/live_tracking")) {
    if (childId) {
      const active = Boolean(data?.active);
      const durationSeconds = data?.expiresAt ? Math.max(0, Math.round((data.expiresAt - Date.now()) / 1000)) : 600;
      await serverApiClient.setLiveTracking(childId, active, durationSeconds);
    }
    return;
  }

  // 14. Pairing Sessions
  if (p.startsWith("pairings/")) {
    const code = path.split("/")[1];
    if (code && /^\d{6}$/.test(code)) {
      await serverApiClient.createPairing({ code, ...data });
      return;
    }
  }
}

export async function rtdbSet(ref: ServerRtdbRef, data: any): Promise<void> {
  return routeWriteToServer(ref.path, data);
}

export async function rtdbUpdate(ref: ServerRtdbRef, data: any): Promise<void> {
  return routeWriteToServer(ref.path, data);
}

export async function rtdbRemove(ref: ServerRtdbRef): Promise<void> {
  const p = ref.path.toLowerCase();
  const childId = extractChildId(ref.path);
  const parentId = extractParentId(ref.path);

  if (p.includes("/children/") || p.includes("/active_children/")) {
    if (childId) {
      await serverApiClient.deleteChild(parentId, childId);
    }
  }
}

/**
 * Route RTDB reads (get) to the appropriate local server REST endpoints
 */
export async function rtdbGet(ref: ServerRtdbRef): Promise<{ exists: () => boolean; val: () => any }> {
  const p = ref.path.toLowerCase();
  const childId = extractChildId(ref.path);
  const parentId = extractParentId(ref.path);

  let val: any = null;

  try {
    // 1. Settings
    if (p.includes("/settings") && childId) {
      val = await serverApiClient.getChildSettings(childId);
    }
    // 2. Stars
    else if (p.includes("/stars") && childId) {
      val = await serverApiClient.getChildStars(childId);
    }
    // 3. Telemetry
    else if (p.includes("/telemetry") && childId) {
      const list = await serverApiClient.getTelemetry(childId, 1);
      val = list && list.length > 0 ? list[0] : null;
    }
    // 4. Children list
    else if (p.includes("/children") || p.includes("/active_children")) {
      const list = await serverApiClient.getChildrenList(parentId);
      if (childId) {
        val = list.find((c: any) => c.id === childId) || null;
      } else {
        const obj: Record<string, any> = {};
        list.forEach((c: any) => { if (c.id) obj[c.id] = c; });
        val = Object.keys(obj).length > 0 ? obj : null;
      }
    }
    // 5. Pairing session (only 6-digit PIN, not pairings/sync/...)
    else if (p.startsWith("pairings/") && !p.includes("/sync/")) {
      const code = ref.path.split("/")[1];
      if (code && /^\d{6}$/.test(code)) {
        val = await serverApiClient.getPairing(code);
      }
    }
    // 5.1 Remote Commands active
    else if ((p.includes("/commands/active") || p.includes("/pc_commands/active")) && childId) {
      const commands = await serverApiClient.getCommands(childId);
      val = commands && commands.length > 0 ? commands[0] : null;
    }
    // 6. Safe zones
    else if (p.includes("/safezones")) {
      const zones = await serverApiClient.getSafeZones(childId || parentId);
      val = { safeZones: zones, updatedAt: Date.now() };
    }
    // 7. Live tracking
    else if (p.includes("/live_tracking") && childId) {
      val = await serverApiClient.getLiveTracking(childId);
    }
  } catch (err) {
    console.warn("rtdbGet adapter error for path:", ref.path, err);
  }

  return {
    exists: () => val !== null && val !== undefined,
    val: () => val,
  };
}

/**
 * Route RTDB real-time listeners (onValue) to Server-Sent Events (SSE)
 */
export function rtdbOnValue(
  ref: ServerRtdbRef,
  callback: (snap: { exists: () => boolean; val: () => any }) => void,
  _errorCallback?: any
): () => void {
  const p = ref.path.toLowerCase();
  const childId = extractChildId(ref.path);
  const cleanParent = extractParentId(ref.path);

  // Perform initial load to populate callback immediately
  rtdbGet(ref).then((initialSnap) => {
    if (initialSnap.exists()) {
      callback(initialSnap);
    }
  }).catch(() => {});

  let eventName = "";
  let filterFn = (_payload: any) => true;
  let transformFn = (payload: any) => payload;

  if (p.includes("/settings")) {
    eventName = "settings";
    filterFn = (d: any) => !childId || d?.childId === childId;
    transformFn = (d: any) => d?.settings || d;
  } else if (p.includes("/stars")) {
    eventName = "stars";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/telemetry") || p.includes("/devices/")) {
    eventName = "telemetry";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/sos")) {
    eventName = "sos";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/commands/active") || p.includes("/pc_commands/active")) {
    eventName = "command";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/commands/lastack")) {
    eventName = "command_ack";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/time_requests")) {
    eventName = "time_request";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/chat_messages")) {
    eventName = "chat";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/children") || p.includes("/active_children")) {
    eventName = "children_updated";
    filterFn = (d: any) => !cleanParent || d?.parentId === cleanParent;
    transformFn = (d: any) => {
      if (Array.isArray(d?.children)) {
        const obj: Record<string, any> = {};
        d.children.forEach((c: any) => { if (c.id) obj[c.id] = c; });
        return obj;
      }
      return d;
    };
  } else if (p.includes("/safezones")) {
    eventName = "safe_zones";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.includes("/live_tracking")) {
    eventName = "live_tracking";
    filterFn = (d: any) => !childId || d?.childId === childId;
  } else if (p.startsWith("pairings/")) {
    eventName = "pairing_connected";
  }

  if (!eventName) {
    return () => {};
  }

  const unsub = serverApiClient.on(eventName, (rawPayload: any) => {
    if (filterFn(rawPayload)) {
      const transformed = transformFn(rawPayload);
      callback({
        exists: () => transformed !== null && transformed !== undefined,
        val: () => transformed,
      });
    }
  });

  // Fast polling fallback for commands & settings (ensures 100% reliable execution even if SSE stream is buffered by Cloudflare tunnel/mobile carrier)
  let pollTimer: any = null;
  if (p.includes("/commands/active") || p.includes("/pc_commands/active") || p.includes("/settings")) {
    pollTimer = setInterval(() => {
      rtdbGet(ref).then((snap) => {
        if (snap.exists()) {
          callback(snap);
        }
      }).catch(() => {});
    }, 3000);
  }

  return () => {
    if (pollTimer) clearInterval(pollTimer);
    unsub();
  };
}
