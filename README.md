# FCB API

Node/Express API and Socket.IO notification service for the VGMates FCB1010 live rig.

The API reads and writes JSON data files, exposes maintenance endpoints, provides preset usage lookups, and relays controller/UI notifications over Socket.IO.

Live data is stored outside this repository. By default the API reads `/home/pi/fcbdata/` on the Raspberry Pi. Override it with:

```powershell
$env:FCB_DATA_PATH="D:\V\Projects\fcbdata"
```

## Install

Node.js 20 or newer is required.

```powershell
npm install
```

## Run

```powershell
npm start
```

Set `FCB_CORS_ORIGINS` to a comma-separated list when the UI is served from
origins other than the local development server or `http://192.168.37.2`.

## Test

```powershell
npm test
```
