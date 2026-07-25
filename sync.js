/* Cloud sync: push new/edited records while authenticated; pull for other devices.
   Does NOT auto-migrate the entire pre-existing local collection on first login.
   Never deletes IndexedDB DataURLs. Advanced multi-device conflict resolution is deferred. */
(() => {
  const BUCKET = "user-media";
  const SIGNED_URL_TTL = 60 * 60;
  let syncInFlight = null;
  let pullInFlight = null;

  function client() {
    return window.VMSupabase.getSupabase();
  }

  function userId() {
    return window.VMAuth.getState().user?.id || null;
  }

  function online() {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  }

  function dataUrlToBlob(dataUrl) {
    const [header, payload] = String(dataUrl || "").split(",");
    if (!header || payload === undefined) throw new Error("Conteúdo de mídia inválido.");
    const mime = header.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
    const binary = header.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function extFromMime(mime, fallback = "bin") {
    const map = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/webm": "webm",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "application/pdf": "pdf"
    };
    return map[String(mime || "").toLowerCase()] || fallback;
  }

  function storagePath(uid, ownerType, ownerId, assetId, mime) {
    const ext = extFromMime(mime, "bin");
    return `${uid}/${ownerType}/${ownerId}/${assetId}.${ext}`;
  }

  async function uploadDataUrl({ uid, ownerType, ownerId, assetId, dataUrl, contentType }) {
    const blob = dataUrlToBlob(dataUrl);
    const path = storagePath(uid, ownerType, ownerId, assetId, contentType || blob.type);
    const { error } = await client().storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: contentType || blob.type || "application/octet-stream"
    });
    if (error) throw error;
    return { path, size: blob.size, mime: contentType || blob.type || "application/octet-stream" };
  }

  async function upsertMediaRow(row) {
    const { error } = await client().from("media_assets").upsert(row, { onConflict: "user_id,id" });
    if (error) throw error;
  }

  async function replaceOwnerMedia({ uid, ownerType, ownerId, assets }) {
    // Soft-mark previous rows for this owner, then upsert current set (idempotent by asset id)
    const { error: clearError } = await client()
      .from("media_assets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", uid)
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .is("deleted_at", null);
    if (clearError) throw clearError;

    for (const asset of assets) {
      await upsertMediaRow({
        user_id: uid,
        id: asset.id,
        owner_type: ownerType,
        owner_id: ownerId,
        purpose: asset.purpose,
        storage_path: asset.storage_path,
        original_name: asset.original_name || "arquivo",
        mime_type: asset.mime_type || "application/octet-stream",
        size_bytes: asset.size_bytes || 0,
        sort_order: asset.sort_order || 0,
        duration_seconds: asset.duration_seconds ?? null,
        deleted_at: null,
        updated_at: new Date().toISOString()
      });
    }
  }

  function itemToRow(uid, item) {
    return {
      user_id: uid,
      id: String(item.id),
      name: item.name || "",
      category: item.category || "",
      subcategory: item.subcategory || "",
      brand: item.brand || "",
      model: item.model || "",
      scale: item.scale || "",
      year: item.year || "",
      condition: item.condition || "",
      paid_value: Number(item.paidValue || 0),
      estimated_value: Number(item.estimatedValue || 0),
      acquired_at: item.acquiredAt || "",
      acquired_place: item.acquiredPlace || "",
      serial: item.serial || "",
      tags: item.tags || "",
      description: item.description || "",
      notes: item.notes || "",
      favorite: !!item.favorite,
      desired: !!item.desired,
      rare: !!item.rare,
      owned: Object.prototype.hasOwnProperty.call(item, "owned") ? !!item.owned : null,
      free_memory_text: item.freeMemoryText || "",
      memory: item.memory || "",
      related_person: item.relatedPerson || "",
      related_place: item.relatedPlace || "",
      related_event: item.relatedEvent || "",
      storage_location: item.storageLocation || "",
      event_date: item.eventDate || "",
      country: item.country || "",
      face_value: item.faceValue || "",
      material: item.material || "",
      connected_items: item.connectedItems || "",
      created_at: item.createdAt || new Date().toISOString(),
      updated_at: item.updatedAt || new Date().toISOString(),
      deleted_at: null
    };
  }

  function rowToItem(row, mediaByOwner) {
    const assets = mediaByOwner.get(`item:${row.id}`) || [];
    const photos = assets
      .filter((a) => a.purpose === "photo")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => a.localDataUrl)
      .filter(Boolean);
    const videoAsset = assets.find((a) => a.purpose === "video");
    const attachments = assets
      .filter((a) => a.purpose === "attachment")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        id: a.id,
        name: a.original_name,
        type: a.mime_type,
        size: Number(a.size_bytes || 0),
        addedAt: a.created_at,
        dataUrl: a.localDataUrl || ""
      }));
    const memoryAudios = assets
      .filter((a) => a.purpose === "memory_audio")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        id: a.id,
        name: a.original_name,
        type: a.mime_type,
        size: Number(a.size_bytes || 0),
        duration: Number(a.duration_seconds || 0),
        addedAt: a.created_at,
        dataUrl: a.localDataUrl || ""
      }));

    const item = {
      id: row.id,
      name: row.name || "",
      category: row.category || "",
      subcategory: row.subcategory || "",
      brand: row.brand || "",
      model: row.model || "",
      scale: row.scale || "",
      year: row.year || "",
      condition: row.condition || "",
      paidValue: Number(row.paid_value || 0),
      estimatedValue: Number(row.estimated_value || 0),
      acquiredAt: row.acquired_at || "",
      acquiredPlace: row.acquired_place || "",
      serial: row.serial || "",
      tags: row.tags || "",
      description: row.description || "",
      notes: row.notes || "",
      favorite: !!row.favorite,
      desired: !!row.desired,
      rare: !!row.rare,
      freeMemoryText: row.free_memory_text || "",
      memory: row.memory || "",
      relatedPerson: row.related_person || "",
      relatedPlace: row.related_place || "",
      relatedEvent: row.related_event || "",
      storageLocation: row.storage_location || "",
      eventDate: row.event_date || "",
      country: row.country || "",
      faceValue: row.face_value || "",
      material: row.material || "",
      connectedItems: row.connected_items || "",
      photos,
      photo: photos[0] || "",
      video: videoAsset?.localDataUrl || "",
      attachments,
      memoryAudios,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cloudSyncedAt: row.updated_at,
      cloudOrigin: true
    };
    if (row.owned !== null && row.owned !== undefined) item.owned = !!row.owned;
    return item;
  }

  async function pushItem(item) {
    const uid = userId();
    if (!uid || !item?.id) return { ok: false, skipped: true };
    if (!online()) return { ok: false, offline: true };

    const { error } = await client().from("items").upsert(itemToRow(uid, item), { onConflict: "user_id,id" });
    if (error) throw error;

    const assets = [];
    const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
    for (let i = 0; i < photos.length; i += 1) {
      const dataUrl = photos[i];
      if (!String(dataUrl).startsWith("data:")) continue;
      const assetId = `photo-${item.id}-${i}`;
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "item",
        ownerId: item.id,
        assetId,
        dataUrl,
        contentType: dataUrl.match(/^data:([^;]+)/)?.[1]
      });
      assets.push({
        id: assetId,
        purpose: "photo",
        storage_path: uploaded.path,
        original_name: `foto-${i + 1}.${extFromMime(uploaded.mime, "jpg")}`,
        mime_type: uploaded.mime,
        size_bytes: uploaded.size,
        sort_order: i
      });
    }

    if (item.video && String(item.video).startsWith("data:")) {
      const assetId = `video-${item.id}`;
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "item",
        ownerId: item.id,
        assetId,
        dataUrl: item.video,
        contentType: item.video.match(/^data:([^;]+)/)?.[1]
      });
      assets.push({
        id: assetId,
        purpose: "video",
        storage_path: uploaded.path,
        original_name: `video.${extFromMime(uploaded.mime, "mp4")}`,
        mime_type: uploaded.mime,
        size_bytes: uploaded.size,
        sort_order: 0
      });
    }

    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    for (let i = 0; i < attachments.length; i += 1) {
      const file = attachments[i];
      if (!file?.dataUrl || !String(file.dataUrl).startsWith("data:")) continue;
      const assetId = file.id || `att-${item.id}-${i}`;
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "item",
        ownerId: item.id,
        assetId,
        dataUrl: file.dataUrl,
        contentType: file.type
      });
      assets.push({
        id: assetId,
        purpose: "attachment",
        storage_path: uploaded.path,
        original_name: file.name || "arquivo",
        mime_type: uploaded.mime,
        size_bytes: uploaded.size || file.size || 0,
        sort_order: i
      });
    }

    const audios = Array.isArray(item.memoryAudios) ? item.memoryAudios : [];
    for (let i = 0; i < audios.length; i += 1) {
      const file = audios[i];
      if (!file?.dataUrl || !String(file.dataUrl).startsWith("data:")) continue;
      const assetId = file.id || `audio-${item.id}-${i}`;
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "item",
        ownerId: item.id,
        assetId,
        dataUrl: file.dataUrl,
        contentType: file.type
      });
      assets.push({
        id: assetId,
        purpose: "memory_audio",
        storage_path: uploaded.path,
        original_name: file.name || "memoria-audio",
        mime_type: uploaded.mime,
        size_bytes: uploaded.size || file.size || 0,
        sort_order: i,
        duration_seconds: file.duration || null
      });
    }

    await replaceOwnerMedia({ uid, ownerType: "item", ownerId: item.id, assets });
    return { ok: true };
  }

  async function pushCategory(category) {
    const uid = userId();
    if (!uid || !category?.id) return { ok: false, skipped: true };
    if (!online()) return { ok: false, offline: true };

    let imagePath = null;
    const assets = [];

    if (category.image && String(category.image).startsWith("data:")) {
      const assetId = `cover-${category.id}`;
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "category",
        ownerId: category.id,
        assetId,
        dataUrl: category.image,
        contentType: category.image.match(/^data:([^;]+)/)?.[1]
      });
      imagePath = uploaded.path;
      assets.push({
        id: assetId,
        purpose: "cover",
        storage_path: uploaded.path,
        original_name: `capa.${extFromMime(uploaded.mime, "jpg")}`,
        mime_type: uploaded.mime,
        size_bytes: uploaded.size,
        sort_order: 0
      });
    }

    const attachments = Array.isArray(category.attachments) ? category.attachments : [];
    for (let i = 0; i < attachments.length; i += 1) {
      const file = attachments[i];
      if (!file?.dataUrl || !String(file.dataUrl).startsWith("data:")) continue;
      const assetId = file.id || `catt-${category.id}-${i}`;
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "category",
        ownerId: category.id,
        assetId,
        dataUrl: file.dataUrl,
        contentType: file.type
      });
      assets.push({
        id: assetId,
        purpose: "attachment",
        storage_path: uploaded.path,
        original_name: file.name || "arquivo",
        mime_type: uploaded.mime,
        size_bytes: uploaded.size || file.size || 0,
        sort_order: i
      });
    }

    const { error } = await client().from("categories").upsert({
      user_id: uid,
      id: category.id,
      name: category.name || "",
      image_path: imagePath,
      created_at: category.createdAt || new Date().toISOString(),
      updated_at: category.updatedAt || new Date().toISOString(),
      deleted_at: null
    }, { onConflict: "user_id,id" });
    if (error) throw error;

    await replaceOwnerMedia({ uid, ownerType: "category", ownerId: category.id, assets });
    return { ok: true };
  }

  async function pushProfile(profile) {
    const uid = userId();
    if (!uid) return { ok: false, skipped: true };
    if (!online()) return { ok: false, offline: true };

    let photoPath = null;
    if (profile.photo && String(profile.photo).startsWith("data:")) {
      const assetId = "profile-photo";
      const uploaded = await uploadDataUrl({
        uid,
        ownerType: "profile",
        ownerId: uid,
        assetId,
        dataUrl: profile.photo,
        contentType: profile.photo.match(/^data:([^;]+)/)?.[1]
      });
      photoPath = uploaded.path;
      await replaceOwnerMedia({
        uid,
        ownerType: "profile",
        ownerId: uid,
        assets: [{
          id: assetId,
          purpose: "profile_photo",
          storage_path: uploaded.path,
          original_name: `perfil.${extFromMime(uploaded.mime, "jpg")}`,
          mime_type: uploaded.mime,
          size_bytes: uploaded.size,
          sort_order: 0
        }]
      });
    } else if (!profile.photo) {
      await replaceOwnerMedia({ uid, ownerType: "profile", ownerId: uid, assets: [] });
    }

    const row = {
      id: uid,
      name: profile.name || "",
      birth_date: profile.birthDate || null,
      bio: profile.bio || "",
      updated_at: profile.updatedAt || new Date().toISOString()
    };
    if (photoPath || !profile.photo) row.photo_path = photoPath;

    const { error } = await client().from("profiles").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return { ok: true };
  }

  async function deleteRemoteItem(itemId) {
    const uid = userId();
    if (!uid || !itemId || !online()) return { ok: false };
    const now = new Date().toISOString();
    await client().from("items").update({ deleted_at: now }).eq("user_id", uid).eq("id", itemId);
    await client().from("media_assets").update({ deleted_at: now }).eq("user_id", uid).eq("owner_type", "item").eq("owner_id", itemId);
    return { ok: true };
  }

  async function deleteRemoteCategory(categoryId) {
    const uid = userId();
    if (!uid || !categoryId || !online()) return { ok: false };
    const now = new Date().toISOString();
    await client().from("categories").update({ deleted_at: now }).eq("user_id", uid).eq("id", categoryId);
    await client().from("media_assets").update({ deleted_at: now }).eq("user_id", uid).eq("owner_type", "category").eq("owner_id", categoryId);
    return { ok: true };
  }

  async function hydrateMediaAsset(asset) {
    const { data, error } = await client().storage.from(BUCKET).createSignedUrl(asset.storage_path, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) {
      return { ...asset, localDataUrl: "" };
    }
    try {
      const res = await fetch(data.signedUrl);
      if (!res.ok) return { ...asset, localDataUrl: "" };
      const blob = await res.blob();
      const localDataUrl = await blobToDataUrl(blob);
      return { ...asset, localDataUrl };
    } catch {
      return { ...asset, localDataUrl: "" };
    }
  }

  async function pullAll() {
    const uid = userId();
    if (!uid) return { ok: false, skipped: true };
    if (!online()) return { ok: false, offline: true };
    if (pullInFlight) return pullInFlight;

    pullInFlight = (async () => {
      try {
        const sb = client();
        const [profileRes, categoriesRes, itemsRes, mediaRes] = await Promise.all([
          sb.from("profiles").select("*").eq("id", uid).maybeSingle(),
          sb.from("categories").select("*").eq("user_id", uid).is("deleted_at", null),
          sb.from("items").select("*").eq("user_id", uid).is("deleted_at", null),
          sb.from("media_assets").select("*").eq("user_id", uid).is("deleted_at", null)
        ]);

        if (profileRes.error) throw profileRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (itemsRes.error) throw itemsRes.error;
        if (mediaRes.error) throw mediaRes.error;

        const mediaRows = mediaRes.data || [];
        const hydrated = [];
        for (const row of mediaRows) {
          hydrated.push(await hydrateMediaAsset(row));
        }

        const mediaByOwner = new Map();
        for (const asset of hydrated) {
          const key = `${asset.owner_type}:${asset.owner_id}`;
          if (!mediaByOwner.has(key)) mediaByOwner.set(key, []);
          mediaByOwner.get(key).push(asset);
        }

        const remoteItems = (itemsRes.data || []).map((row) => rowToItem(row, mediaByOwner));
        const remoteCategories = (categoriesRes.data || []).map((row) => {
          const assets = mediaByOwner.get(`category:${row.id}`) || [];
          const cover = assets.find((a) => a.purpose === "cover");
          const attachments = assets
            .filter((a) => a.purpose === "attachment")
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((a) => ({
              id: a.id,
              name: a.original_name,
              type: a.mime_type,
              size: Number(a.size_bytes || 0),
              addedAt: a.created_at,
              dataUrl: a.localDataUrl || ""
            }));
          return {
            id: row.id,
            name: row.name || "",
            image: cover?.localDataUrl || "",
            attachments,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            cloudSyncedAt: row.updated_at,
            cloudOrigin: true
          };
        });

        let remoteProfile = null;
        if (profileRes.data) {
          const p = profileRes.data;
          const assets = mediaByOwner.get(`profile:${uid}`) || [];
          const photoAsset = assets.find((a) => a.purpose === "profile_photo");
          remoteProfile = {
            name: p.name || "",
            birthDate: p.birth_date || "",
            bio: p.bio || "",
            photo: photoAsset?.localDataUrl || "",
            updatedAt: p.updated_at,
            cloudSyncedAt: p.updated_at,
            cloudOrigin: true
          };
        }

        return {
          ok: true,
          items: remoteItems,
          categories: remoteCategories,
          profile: remoteProfile
        };
      } finally {
        pullInFlight = null;
      }
    })();

    return pullInFlight;
  }

  /**
   * Merge remote cloud records into local arrays without deleting local-only data.
   * Remote wins for the same id when remote.updatedAt >= local.updatedAt.
   */
  function mergeCollections(localItems, localCategories, localProfile, remote) {
    const itemsById = new Map((localItems || []).map((i) => [String(i.id), i]));
    for (const remoteItem of remote.items || []) {
      const local = itemsById.get(String(remoteItem.id));
      if (!local) {
        itemsById.set(String(remoteItem.id), remoteItem);
        continue;
      }
      const localTs = Date.parse(local.updatedAt || 0) || 0;
      const remoteTs = Date.parse(remoteItem.updatedAt || 0) || 0;
      if (remoteTs >= localTs) itemsById.set(String(remoteItem.id), {
        ...remoteItem,
        // Prefer keeping a local DataURL if remote media failed to hydrate
        photos: (remoteItem.photos?.length ? remoteItem.photos : local.photos) || [],
        photo: remoteItem.photo || local.photo || "",
        video: remoteItem.video || local.video || "",
        attachments: remoteItem.attachments?.length ? remoteItem.attachments : (local.attachments || []),
        memoryAudios: remoteItem.memoryAudios?.length ? remoteItem.memoryAudios : (local.memoryAudios || [])
      });
    }

    const catsById = new Map((localCategories || []).map((c) => [String(c.id), c]));
    for (const remoteCat of remote.categories || []) {
      const local = catsById.get(String(remoteCat.id));
      if (!local) {
        catsById.set(String(remoteCat.id), remoteCat);
        continue;
      }
      const localTs = Date.parse(local.updatedAt || 0) || 0;
      const remoteTs = Date.parse(remoteCat.updatedAt || 0) || 0;
      if (remoteTs >= localTs) catsById.set(String(remoteCat.id), {
        ...remoteCat,
        image: remoteCat.image || local.image || "",
        attachments: remoteCat.attachments?.length ? remoteCat.attachments : (local.attachments || [])
      });
    }

    let profile = localProfile || { name: "", birthDate: "", bio: "", photo: "", updatedAt: new Date().toISOString() };
    if (remote.profile) {
      const localTs = Date.parse(profile.updatedAt || 0) || 0;
      const remoteTs = Date.parse(remote.profile.updatedAt || 0) || 0;
      if (!profile.name && !profile.bio && !profile.photo) {
        profile = { ...remote.profile };
      } else if (remoteTs >= localTs) {
        profile = {
          ...remote.profile,
          photo: remote.profile.photo || profile.photo || ""
        };
      }
    }

    return {
      items: [...itemsById.values()],
      categories: [...catsById.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      profile
    };
  }

  async function pushItemSafe(item) {
    try {
      return await pushItem(item);
    } catch (error) {
      console.error("[VMSync] pushItem", error);
      return { ok: false, error };
    }
  }

  async function pushCategorySafe(category) {
    try {
      return await pushCategory(category);
    } catch (error) {
      console.error("[VMSync] pushCategory", error);
      return { ok: false, error };
    }
  }

  async function pushProfileSafe(profile) {
    try {
      return await pushProfile(profile);
    } catch (error) {
      console.error("[VMSync] pushProfile", error);
      return { ok: false, error };
    }
  }

  async function ensureProfileRow(name = "") {
    const uid = userId();
    if (!uid || !online()) return;
    try {
      await client().from("profiles").upsert({
        id: uid,
        name: name || "",
        bio: "",
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });
    } catch (error) {
      console.error("[VMSync] ensureProfileRow", error);
    }
  }

  window.VMSync = {
    pushItem: pushItemSafe,
    pushCategory: pushCategorySafe,
    pushProfile: pushProfileSafe,
    deleteRemoteItem,
    deleteRemoteCategory,
    pullAll,
    mergeCollections,
    ensureProfileRow,
    isOnline: online
  };
})();
