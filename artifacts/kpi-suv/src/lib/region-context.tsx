import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { getTumanlarByViloyat } from "@/lib/viloyatlar";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

interface RegionState {
  selectedViloyat: string;
  selectedTuman: string;
  showAllTumans: boolean;
  viloyatTumanlar: string[];
  selectedYear: number;
  selectedMonth: number;
  davrTuri: string;
  globalPeriod: string;
  setSelectedViloyat: (v: string) => void;
  setSelectedTuman: (t: string) => void;
  setShowAllTumans: (v: boolean) => void;
  setViloyatTumanlar: (list: string[]) => void;
  setSelectedYear: (y: number) => void;
  setSelectedMonth: (m: number) => void;
  setDavrTuri: (d: string) => void;
}

const RegionContext = createContext<RegionState>({
  selectedViloyat: "",
  selectedTuman: "",
  showAllTumans: false,
  viloyatTumanlar: [],
  selectedYear: CURRENT_YEAR,
  selectedMonth: CURRENT_MONTH,
  davrTuri: "yillik",
  globalPeriod: "",
  setSelectedViloyat: () => {},
  setSelectedTuman: () => {},
  setShowAllTumans: () => {},
  setViloyatTumanlar: () => {},
  setSelectedYear: () => {},
  setSelectedMonth: () => {},
  setDavrTuri: () => {},
});

const LS_VILOYAT    = "kpi_selected_viloyat";
const LS_TUMAN      = "kpi_selected_tuman";
const LS_SHOW_ALL   = "kpi_show_all_tumans";
const LS_YEAR       = "kpi_selected_year";
const LS_MONTH      = "kpi_selected_month";
const LS_DAVR_TURI  = "kpi_davr_turi";

function pad(n: number) { return String(n).padStart(2, "0"); }

export function RegionProvider({ children }: { children: ReactNode }) {
  const [selectedViloyat, setViloyatState] = useState<string>(
    () => localStorage.getItem(LS_VILOYAT) ?? ""
  );
  const [selectedTuman, setTumanState] = useState<string>(
    () => localStorage.getItem(LS_TUMAN) ?? ""
  );
  const [showAllTumans, setShowAllTumansState] = useState<boolean>(
    () => localStorage.getItem(LS_SHOW_ALL) === "true"
  );
  const [_viloyatTumanlar, setViloyatTumanlarState] = useState<string[]>([]);

  const [selectedYear, setYearState] = useState<number>(() => {
    const v = parseInt(localStorage.getItem(LS_YEAR) ?? "");
    return isNaN(v) ? CURRENT_YEAR : v;
  });
  const [selectedMonth, setMonthState] = useState<number>(() => {
    const v = parseInt(localStorage.getItem(LS_MONTH) ?? "");
    return isNaN(v) ? CURRENT_MONTH : v;
  });
  const [davrTuri, setDavrTuriState] = useState<string>(
    () => localStorage.getItem(LS_DAVR_TURI) ?? "yillik"
  );

  const viloyatTumanlar = useMemo(() => {
    if (showAllTumans && selectedViloyat) {
      return getTumanlarByViloyat(selectedViloyat);
    }
    return _viloyatTumanlar;
  }, [showAllTumans, selectedViloyat, _viloyatTumanlar]);

  const globalPeriod = useMemo(() => {
    return `${selectedYear}-${pad(selectedMonth)}`;
  }, [selectedYear, selectedMonth]);

  const setSelectedViloyat = (v: string) => {
    setViloyatState(v);
    localStorage.setItem(LS_VILOYAT, v);
  };
  const setSelectedTuman = (t: string) => {
    setTumanState(t);
    localStorage.setItem(LS_TUMAN, t);
  };
  const setShowAllTumans = (v: boolean) => {
    setShowAllTumansState(v);
    localStorage.setItem(LS_SHOW_ALL, v ? "true" : "false");
  };
  const setViloyatTumanlar = (list: string[]) => {
    setViloyatTumanlarState(list);
  };
  const setSelectedYear = (y: number) => {
    setYearState(y);
    localStorage.setItem(LS_YEAR, String(y));
  };
  const setSelectedMonth = (m: number) => {
    setMonthState(m);
    localStorage.setItem(LS_MONTH, String(m));
  };
  const setDavrTuri = (d: string) => {
    setDavrTuriState(d);
    localStorage.setItem(LS_DAVR_TURI, d);
  };

  return (
    <RegionContext.Provider
      value={{
        selectedViloyat,
        selectedTuman,
        showAllTumans,
        viloyatTumanlar,
        selectedYear,
        selectedMonth,
        davrTuri,
        globalPeriod,
        setSelectedViloyat,
        setSelectedTuman,
        setShowAllTumans,
        setViloyatTumanlar,
        setSelectedYear,
        setSelectedMonth,
        setDavrTuri,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
