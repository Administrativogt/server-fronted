import { Col, Row } from "antd";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import { PRIMARY, INFO, type Tokens, wcard, makeChartTheme } from "./theme";

/* index signature para compatibilidad con el tipo BarDatum de Nivo (Record<string, …>) */
interface BarDatum { estado: string; N: number; D: number; [key: string]: string | number }
interface PieDatum { id: string; label: string; value: number; color: string }

interface Props {
  bar: BarDatum[];
  pie: PieDatum[];
  tk: Tokens;
}

export default function DashboardCharts({ bar, pie, tk }: Props) {
  const chartTheme = makeChartTheme(tk);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <div style={{ ...wcard(tk, { padding:"20px 22px 14px" }) }}>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:tk.t1, marginBottom:3 }}>
            Comparativa general
          </div>
          <div style={{ fontSize:12, color:tk.t2, marginBottom:14, fontWeight:500 }}>
            Notificaciones vs Documentos por estado
          </div>
          <div style={{ height:230 }}>
            <ResponsiveBar
              data={bar}
              keys={["N","D"]} indexBy="estado" groupMode="grouped"
              colors={[PRIMARY, INFO]}
              borderRadius={4} padding={0.32} innerPadding={3}
              axisBottom={{ tickSize:0, tickPadding:8 }}
              axisLeft={{ tickSize:0, tickPadding:8 }}
              enableGridY gridYValues={4} enableLabel={false}
              legends={[{
                dataFrom:"keys", anchor:"bottom", direction:"row", translateY:36,
                itemWidth:110, itemHeight:12, symbolSize:8, symbolShape:"square",
                data:[
                  { id:"N", label:"Notificaciones", color:PRIMARY },
                  { id:"D", label:"Documentos",     color:INFO    },
                ],
              }]}
              margin={{ top:8, right:14, bottom:46, left:38 }}
              theme={chartTheme}
            />
          </div>
        </div>
      </Col>

      <Col xs={24} lg={8}>
        <div style={{ ...wcard(tk, { padding:"20px 22px 14px" }) }}>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:tk.t1, marginBottom:3 }}>
            Documentos por estado
          </div>
          <div style={{ fontSize:12, color:tk.t2, marginBottom:14, fontWeight:500 }}>
            Distribución actual
          </div>
          {pie.length > 0 ? (
            <div style={{ height:230 }}>
              <ResponsivePie
                data={pie}
                innerRadius={0.65} padAngle={2} cornerRadius={4}
                colors={{ datum: "data.color" }}
                arcLinkLabelsSkipAngle={10} arcLinkLabelsTextColor={tk.t2}
                arcLinkLabelsThickness={1.5} arcLinkLabelsColor={{ from:"color" }}
                arcLabelsSkipAngle={10} arcLabelsTextColor="#fff"
                legends={[{ anchor:"bottom", direction:"row", translateY:36,
                  itemWidth:82, itemHeight:12, symbolSize:8, symbolShape:"circle",
                  itemTextColor:tk.t2 as string }]}
                margin={{ top:10, right:10, bottom:46, left:10 }}
                theme={chartTheme}
              />
            </div>
          ) : (
            <div style={{ height:230, display:"flex", alignItems:"center", justifyContent:"center",
              color:tk.t3, fontSize:13 }}>Sin datos</div>
          )}
        </div>
      </Col>
    </Row>
  );
}
