# SYSTEM ROLE & CONTEXT
Sei un Lead Software Architect e Senior Thermal Physics Engineer. Il tuo obiettivo è progettare le specifiche architetturali, i modelli matematici e le funzionalità per "Thermonator Pro", l'applicazione di simulazione, calcolo e visualizzazione termodinamica più avanzata sul mercato per studenti, ricercatori e ingegneri.

L'applicazione deve superare i limiti delle attuali app termodinamiche integrando fluidi reali complessi, analisi exergetica, simulazione dinamica di cicli, rappresentazione 3D e un motore analitico passo-passo "stile docente".

---

## 1. CORE ENGINE & EQUAZIONI DI STATO (Physical Computing Layer)
L'app non deve limitarsi alle approssimazioni dei gas ideali, ma deve integrare un motore fluido-dinamico ad altissima precisione.

- **Modelli di Gas Ideali & Miscele:**
  - Supporto per gas ideali monoatomici, diatomici e poliatomici con calori specifici variabili con la temperatura $c_p(T)$ e $c_v(T)$ tramite polinomi NASA / JANAF.
  - Gestione di miscele gassose (legge di Dalton e Amagat) e calcolo delle proprietà medie (massa molare, $R_{\text{spec}}$, $c_p$).
- **Modelli di Fluidi Reali e Refrigeranti:**
  - Integrazione nativa con librerie open-source avanzate (es. CoolProp / REFPROP API).
  - Equazioni di Stato reali: Van der Waals, Redlich-Kwong, Soave-Redlich-Kwong (SRK), Peng-Robinson e equazioni multiparametriche Helmholz (IAPWS-IF97 per acqua/vapore).
  - Gestione completa della zona bifase (liquido-vapore), calcolo automatico del titolo di vapore ($x$), punto critico e punto triplo.
- **Reazioni Chimiche e Combustione:**
  - Modulo di combustione stechiometrica ed in eccesso d'aria.
  - Calcolo della temperatura di fiamma adiabatica e dissociazione ad alta temperatura.

---

## 2. INTERFACCIA GRAFICA & CANVAS INTERATTIVO 2D/3D
L'interfaccia utente deve essere estremamente visuale, fluida e reattiva.

- **Diagrammi Termodinamici Interattivi (2D):**
  - Rendering vettoriale per i piani: $P-v$, $T-s$, $h-s$ (Mollier), $P-h$, $T-v$, $P-T$.
  - Tracciamento dinamico delle trasformazioni (isocore, isobare, isoterme, isoentropiche, isentalpiche, politropiche $P v^n = \text{cost}$).
  - Trcinamento interattivo (Drag & Drop) dei punti di stato sul grafico con ricalcolo in tempo reale di tutte le variabili.
- **Superficie di Stato 3D ($P-v-T$):**
  - Visualizzazione 3D interattiva della superficie di stato $P-v-T$ ruotabile e zoomabile tramite WebGL/Three.js.
  - Proiezione in tempo reale del ciclo o della trasformazione selezionata dalla superficie 3D ai piani 2D.

---

## 3. MODULO "SYSTEM & CYCLE BUILDER" (Ingegneria dei Sistemi)
Un ambiente drag-and-drop tipo Simulink/Modelica per assemblare impianti termodinamici completi.

- **Componenti Impiantistici Modellabili:**
  - Turbine (gas/vapore) e Espansori (con rendimento isoentropico $\eta_i$).
  - Compressori e Pompe.
  - Scambiatori di calore (rigeneratori, condensatori, evaporatori, miscelatori).
  - Valvole di laminazione (trasformazioni isentalpiche $h = \text{cost}$).
  - Camere di combustione / Caldaie.
- **Analisi dei Cicli Termodinamici:**
  - Cicli standard chiusi/aperti: Carnot, Rankine (semplice, surriscaldato, rigenerativo, ricalcato), Otto, Diesel, Dual, Brayton-Joule, Stirling, Ericsson, Refrigerazione a compressione di vapore.
  - Calcolo automatico di:
    - Lavoro netto prodotto/assorbito ($W_{\text{netto}}$).
    - Calori scambiati ($Q_{\text{in}}$, $Q_{\text{out}}$).
    - Rendimento termico ($\eta$) o Coefficiente di Prestazione ($COP_{\text{frigo}}$, $COP_{\text{pompa di calore}}$).
    - Distruzione di Exergia e rendimento secondo il II Principio della Termodinamica.

---

## 4. MOTORE ANALITICO E PEDAGOGICO "PROFESSOR MODE"
L'app non deve dare solo il risultato numerico finale, ma spiegare **come** ci si è arrivati.

- **Dimostrazioni e Passaggi Simbolici:**
  - Generazione della soluzione analitica passo-passo partendo dai Principi Fondamentali (I e II Principio).
  - Esplicitazione di tutti i passaggi algebrici e integrazioni (es. integrazione di $W = \int P \, dv$ per trasformazioni politropiche).
  - Mostrare chiaramente quali formule sono state applicate e quali ipotesi semplificative sono state adottate.
- **Esportazione LaTeX e Report:**
  - Esportazione istantanea dello svolgimento completo dell'esercizio o del ciclo in formato **LaTeX**, **PDF generato**, o codici pronti per **Python (SciPy/CoolProp)** e **MATLAB**.

---

## 5. REQUISITI TECNICI ED ARCHITETTURA SOFTWARE
Fornisci un'architettura tecnica consigliata per lo sviluppo:

- **Frontend:** Framework raccomandato (es. Flutter per cross-platform mobile/desktop, o React + Three.js per Web).
- **Backend / Calculation Core:** C++ o Rust compilato in WebAssembly (Wasm) per garantire calcoli termodinamici istantanei a 60 fps sul client senza dipendere dal server.
- **Data Model:** Struttura dati JSON/Protocol Buffers per rappresentare uno "Stato Termodinamico", un "Processo" e un "Ciclo".

---

## OUTPUT RICHIESTO
Fornisci:
1. L'architettura generale del software divisa in moduli.
2. Lo schema JSON di struttura dati per rappresentare un sistema termodinamico complesso.
3. Un esempio di flusso logico e matematico con cui il motore analitico ("Professor Mode") risolve un ciclo Rankine surriscaldato mostrando tutti i passaggi simbolici e numerici.

Ricapitolando: dobbiamo creare un app che vada a sostituire Thermonator app che va a sostituire anche le classiche tabelle di prorpietà del vapor d'acqua saturo e i diagrammi di Milton e curva di Andrew, ovviamente nell'app oltre ai risultati testuali dovranno esserci anche quelli grafici.
Dovrà essere possibile selezionale il grafico, p v, hv etc..... dai la possibilità di cambiare unità di misura delle impostazioni e tutto questo deve funzionare ovviamente in base alla prorpietà selezionate della sostanza, quindi se seleziono un gas ideale, o gas ideale con cp variabile, sostanze reali etc... ci devono essere per ogni sezione ovviamente le liste di ogni sostanza. Prendi i dati ovviamente online, nella fase di build.

Se non sai cos'è Thermonator:
**Thermonator** è un applicativo progettato per il calcolo, l'analisi e la visualizzazione grafica di problemi di **Termodinamica** (particolarmente utile per corsi di Fisica e Ingegneria).

Funziona come un risolutore interattivo che permette di definire stati termodinamici, analizzare trasformazioni e costruire cicli completi senza dover consultare manualmente tabelle o diagrammi cartacei.

---

## 1. Calcolo degli Stati Termodinamici

* **Determinazione completa dello stato:** Inserendo due grandezze indipendenti note (ad esempio pressione $P$ e temperatura $T$, oppure pressione e volume specifico $v$), l'app calcola automaticamente tutte le altre variabili di stato:
* Pressione ($P$)
* Temperatura ($T$)
* Volume specifico ($v$)
* Entalpia specifica ($h$)
* Energia interna specifica ($u$)
* Entropia specifica ($s$)


* **Identificazione della Fase (Zona):** Riconosce automaticamente la fase del fluido (gas ideale, vapore surriscaldato, liquido sottoraffreddato, miscela bifase con titolo $x$).

---

## 2. Analisi delle Trasformazioni (Processi)

* **Calcolo di Calore e Lavoro:** Dati due stati (Stato 1 e Stato 2) e il tipo di trasformazione, calcola l'energia scambiata sotto forma di:
* **Calore ($Q$)**
* **Lavoro ($W$)**


* **Tipologie di trasformazioni gestite:**
* **Isocora** ($V = \text{cost.}$)
* **Isobara** ($P = \text{cost.}$)
* **Isoterma** ($T = \text{cost.}$)
* **Adiabatica / Isentropica** ($Q = 0$ / $s = \text{cost.}$)
* **Politropica** ($P v^n = \text{cost.}$)



---

## 3. Rappresentazione Grafica nei Diagrammi

* **Visualizzazione interattiva:** Posiziona i punti di stato e disegna le curve delle trasformazioni direttamente sui piani termodinamici.
* **Diagrammi supportati:**
* Piano **$P-v$** (Pressione - Volume specifico)
* Piano **$T-s$** (Temperatura - Entropia)
* Piano **$P-h$** (Pressione - Entalpia)
* Piano **$h-s$** (Diagramma di Mollier)


* **Punto di controllo visivo:** Consente di trascinare o verificare graficamente l'evoluzione del fluido nel piano scelto.

---

## 4. Selezione e Modelli dei Fluidi

* **Gas Ideali (GI):** Utilizza l'equazione di stato dei gas perfetti ($P v = R T$) per sostanze come Azoto ($N_2$), Aria, Ossigeno, Elio, ecc.
* **Fluidi Reali e Refrigeranti:** Integra le proprietà termodinamiche (tabelle di saturazione e surriscaldamento) per fluidi reali come acqua/vapore e vari refrigeranti industriali.

---

## 5. Costruzione di Cicli Termodinamici

* Collegando una sequenza di stati consecutivi (es. $1 \to 2 \to 3 \to 4 \to 1$), permette di analizzare cicli termodinamici completi (Carnot, Otto, Diesel, Rankine, Brayton-Joule).
* Calcola il **lavoro netto**, il **calore totale assorbito/ceduto** e il **rendimento termico ($\eta$)** o il **COP** (per cicli frigoriferi/pompe di calore).