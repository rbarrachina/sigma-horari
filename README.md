# Control horari

Aplicació web personal per portar el **control horari** (jornades, bossa de flexibilitat, vacances i assumptes personals).  
Funciona **100% al navegador** (sense servidor) i es pot desplegar fàcilment a **GitHub Pages**.

> ✅ **App (Vercel)**: https://sigma-horari.vercel.app/  
> 🌐 **App (GitHub Pages)**: https://rbarrachina.github.io/sigma-horari/

---

## ✅ Estat del projecte

Aplicació **operativa** amb configuració inicial guiada i calendari interactiu per a l’any seleccionat. Aquest README explica:

- què fa l’app 🎯
- com executar-la en local 🧪
- com publicar-la 🚀
- on guarda les dades 🔐

---

## ✨ Funcionalitats actuals

**Objectiu:** tenir una eina personal, ràpida i privada per controlar el còmput d’hores i incidències.

**Inclou actualment:**

- Assistència d’onboarding amb configuració guiada (Personal → Horari → Festius)
- Configuració personal (nom, any de calendari, dies de vacances, hores d’AP)
- Definició de dies **presencials** i de **teletreball** per setmana
- Franges **estiu/hivern** amb períodes configurables que cobreixen tot l’any
- Calendari anual amb detall per dia (inici/fi, doble torn, notes)
- Navegació fins al gener de l'any següent per gestionar incidències que es poden arrossegar
- Estats de dia: laboral, festiu, vacances, assumptes propis, flexibilitat i altres
- Resums setmanals amb còmput d’hores i flexibilitat guanyada
- Gestió de **flexibilitat** (acumulada fins a 25h) i consum per dia
- Exportació / importació (JSON) i **reset** complet de dades

---

## 🆕 Versió 1.5

La versió **1.5** afegeix el mes de **gener de l'any següent** al calendari per poder gestionar conceptes que es poden aplicar més enllà del 31 de desembre.

Condicions aplicades:

- **Vacances:** només es poden fer servir fins al **31 de desembre** de l'any del calendari.
- **Assumptes personals (AP):** es poden fer servir fins al **15 de gener** de l'any següent i, excepcionalment, fins al **31 de gener** si no s'han pogut fer per necessitats del servei.
- **Flexibilitat horària:** es pot fer servir fins al **15 de gener** de l'any següent com a màxim.

---

## 🧱 Tecnologies

- Vite + React + TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- TanStack Query + React Router

---

## 🚀 Com començar (local)

Requisits: **Node.js** (recomanat via nvm)

```bash
# 1) Clona el repositori
git clone <URL_DEL_REPO>

# 2) Entra a la carpeta
cd <NOM_CARPETA>

# 3) Instal·la dependències
npm install

# 4) Engega el servidor de desenvolupament
npm run dev
```

Altres scripts útils:

```bash
npm run build     # genera /dist
npm run preview   # previsualitza el build localment
npm run test      # executa tests amb Vitest
```

---

## 🔐 On es guarden les dades?

L’aplicació **guarda la informació al navegador** (sense backend), via **localStorage**.

Claus utilitzades:

- `control-horari-config`
- `control-horari-days`
- `control-horari-onboarding-step`

### Què implica això?
- ✅ Les dades queden **al teu dispositiu** i al **perfil** del navegador
- ⚠️ Si canvies d’ordinador o de perfil, **no hi seran** (a menys que exportis/importis)

### Com comprovar-ho (Brave / Chrome)
1. Obre l’app
2. Fes clic dret → **Inspecciona**
3. Ves a **Application**
4. Mira:
   - **Local Storage** → `https://control-horari-educacio.vercel.app`
   - **IndexedDB** *(no s’utilitza actualment)*
   - **Session Storage**

---

## 🤝 Contribuir

Issues són benvinguts.

---

## 🧾 Llicència i atribució

Aquest projecte es distribueix sota la **Apache License 2.0**.

- Llicència: `LICENSE` (Apache-2.0)
- Atribució: `NOTICE` (crèdits i avisos)

Autoria: **Rafa Barrachina** (GitHub: `@rbarrachina`)
Versió actual: **1.5**

Si redistribueixes el projecte (o una derivació), cal conservar aquests avisos i el crèdit de l’autor.
