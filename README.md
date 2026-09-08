# FCB API

Node/Express API and Socket.IO notification service for the VGMates FCB1010 live rig.

The API reads and writes JSON data files, exposes maintenance endpoints, provides preset usage lookups, and relays controller/UI notifications over Socket.IO.

Gig Control song-preset saves and maintenance preset saves also create immutable, timestamped JSON snapshots under:

- `history/songpresets/<songId>/`
- `history/preset/<presetId>/`

The API creates these folders on the first save. Snapshot files use create-only writes and are never updated in place.

Live data is stored outside this repository. By default the API reads `/home/pi/fcbdata/` on the Raspberry Pi. Override it with:

```powershell
$env:FCB_DATA_PATH="D:\V\Projects\fcbdata"
```

## Install

```powershell
npm install
```

## Run

```powershell
npm start
```

## Test

```powershell
npm test
```
