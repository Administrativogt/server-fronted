import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Button, DatePicker, Skeleton } from "antd";
import { ReloadOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  fetchExchangeRate, fetchRateOnDate,
  type ExchangeRateData, type DateLookupResult,
} from "../../api/exchangeRate";
import { type Tokens, hue, wcard } from "./theme";

/* Tipo de cambio en formato de consulta: una tabla corta (moneda · compra ·
   venta), la fecha de la fuente y la consulta por fecha. Sin gráfica ni
   número gigante: es dato de referencia, no la tarea principal del inicio. */

const fmtQ = (n: number) => `Q ${n.toFixed(4)}`;
const fmtDate = (iso: string) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-GT", { day:"numeric", month:"short", year:"numeric" });

type Row = { code: string; name: string; compra: number; venta: number };

function RateTable({ rows, tk }: { rows: Row[]; tk: Tokens }) {
  const cell: CSSProperties = { padding:"8px 0", borderTop:`1px solid ${tk.divider}`, fontSize:13 };
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <thead>
        <tr style={{ fontSize:12, color:tk.t2, textAlign:"right" }}>
          <th scope="col" style={{ textAlign:"left", fontWeight:600, paddingBottom:6 }}>Moneda</th>
          <th scope="col" style={{ fontWeight:600, paddingBottom:6 }}>Compra</th>
          <th scope="col" style={{ fontWeight:600, paddingBottom:6 }}>Venta</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.code} className="dash-num" style={{ textAlign:"right", color:tk.t1 }}>
            <th scope="row" style={{ ...cell, textAlign:"left", fontWeight:600 }}>
              {r.code} <span style={{ color:tk.t2, fontWeight:400 }}>{r.name}</span>
            </th>
            <td style={{ ...cell, paddingLeft:12, whiteSpace:"nowrap" }}>{fmtQ(r.compra)}</td>
            <td style={{ ...cell, paddingLeft:12, whiteSpace:"nowrap", fontWeight:600 }}>{fmtQ(r.venta)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ExchangeRateCard({ tk }: { tk: Tokens }) {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [lookupDate, setLookupDate] = useState<Dayjs | null>(null);
  const [lookup, setLookup] = useState<DateLookupResult[] | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "error">("idle");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await fetchExchangeRate(7));
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onPickDate = async (d: Dayjs | null) => {
    setLookupDate(d);
    setLookup(null);
    if (!d) { setLookupState("idle"); return; }
    setLookupState("loading");
    try {
      setLookup(await fetchRateOnDate(d.format("YYYY-MM-DD")));
      setLookupState("idle");
    } catch {
      setLookupState("error");
    }
  };

  return (
    <section aria-labelledby="tc-title" style={{ ...wcard(tk, { padding:"18px 20px" }) }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", marginBottom:10 }}>
        <h2 id="tc-title" style={{ margin:0, display:"flex", alignItems:"center", gap:10, fontSize:16, fontWeight:600, color:tk.t1 }}>
          <span aria-hidden style={{ width:28, height:28, borderRadius:8, display:"inline-flex", alignItems:"center",
            justifyContent:"center", background:hue(tk, "dinero").bg, color:hue(tk, "dinero").fg, fontSize:13 }}>
            <SwapOutlined />
          </span>
          Tipo de cambio
        </h2>
        {state === "ok" && data && (
          <span style={{ fontSize:12, color:tk.t2 }}>
            {data.source === "banguat" ? "Banguat" : "Mercado"} · {fmtDate(data.main.fecha)}
          </span>
        )}
      </div>

      {state === "loading" && <Skeleton active title={false} paragraph={{ rows:3 }} />}

      {state === "error" && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, fontSize:13, color:tk.t2 }}>
          No se pudo consultar el tipo de cambio.
          <Button size="small" icon={<ReloadOutlined />} onClick={load}>Reintentar</Button>
        </div>
      )}

      {state === "ok" && data && (
        <RateTable tk={tk} rows={data.currencies.map((c) => ({ code:c.code, name:c.name, compra:c.compra, venta:c.venta }))} />
      )}

      <div style={{ marginTop:14 }}>
        <label htmlFor="tc-fecha" style={{ display:"block", fontSize:12, color:tk.t2, marginBottom:6 }}>
          Consultar otra fecha
        </label>
        <DatePicker id="tc-fecha" size="small" format="DD/MM/YYYY" value={lookupDate}
          onChange={onPickDate} disabledDate={(d) => d.isAfter(dayjs(), "day")}
          placeholder="Elegir fecha" style={{ width:"100%" }} />
        {lookupState === "loading" && <Skeleton active title={false} paragraph={{ rows:2 }} style={{ marginTop:10 }} />}
        {lookupState === "error" && (
          <p style={{ margin:"8px 0 0", fontSize:13, color:tk.t2 }}>
            No hay tipo de cambio para esa fecha o la consulta falló. Prueba con otro día hábil.
          </p>
        )}
        {lookup && lookup.length > 0 && (
          <div style={{ marginTop:10 }}>
            <RateTable tk={tk} rows={lookup.map((r) => ({ code:r.code, name:r.name, compra:r.compra, venta:r.venta }))} />
          </div>
        )}
        {lookup && lookup.length === 0 && (
          <p style={{ margin:"8px 0 0", fontSize:13, color:tk.t2 }}>Sin datos para esa fecha. Prueba con otro día hábil.</p>
        )}
      </div>
    </section>
  );
}
