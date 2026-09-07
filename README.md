# FCB API

Node/Express API and Socket.IO notification service for the VGMates FCB1010 live rig.

The API reads and writes JSON data files, exposes maintenance endpoints, provides preset usage lookups, and relays controller/UI notifications over Socket.IO.

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
