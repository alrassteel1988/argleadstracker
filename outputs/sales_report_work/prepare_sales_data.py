from pathlib import Path
import json

import pandas as pd


SOURCE = Path(r"C:\Users\Glory\Downloads\SALES  REPORT.xlsx")
OUT = Path(r"C:\Users\Glory\Documents\argleadstracker\outputs\sales_report_work\sales_data.json")

df = pd.read_excel(SOURCE, sheet_name="Sheet1", header=2, usecols="B:G", engine="openpyxl")
df = df.dropna(how="all")
df["SR Date"] = pd.to_datetime(df["SR Date"], errors="coerce")
df["LCy Net Amount"] = pd.to_numeric(df["LCy Net Amount"], errors="coerce").fillna(0)
df["Total Tons"] = pd.to_numeric(df["Total Tons"], errors="coerce").fillna(0)
df["Year"] = df["SR Date"].dt.year

customer = (
    df.groupby(["Party Code", "Party Name"], dropna=False)
    .agg(
        total_sales=("LCy Net Amount", "sum"),
        total_tons=("Total Tons", "sum"),
        transactions=("LCy Net Amount", "size"),
        last_transaction_date=("SR Date", "max"),
    )
    .reset_index()
    .sort_values(["total_sales", "Party Name"], ascending=[False, True])
)

yearly = (
    df.groupby("Year", dropna=False)
    .agg(total_sales=("LCy Net Amount", "sum"), total_tons=("Total Tons", "sum"), transactions=("LCy Net Amount", "size"))
    .reset_index()
    .sort_values("Year")
)

payload = {
    "source_file": str(SOURCE),
    "row_count": int(len(df)),
    "customer_count": int(len(customer)),
    "date_min": df["SR Date"].min().strftime("%Y-%m-%d"),
    "date_max": df["SR Date"].max().strftime("%Y-%m-%d"),
    "total_sales": float(df["LCy Net Amount"].sum()),
    "customer": [
        {
            "party_code": "" if pd.isna(row["Party Code"]) else str(row["Party Code"]),
            "party_name": "" if pd.isna(row["Party Name"]) else str(row["Party Name"]),
            "total_sales": float(row["total_sales"]),
            "total_tons": float(row["total_tons"]),
            "transactions": int(row["transactions"]),
            "last_transaction_date": row["last_transaction_date"].strftime("%Y-%m-%d"),
            "business_location": "Pending approved web lookup",
            "country": "",
            "latitude": "",
            "longitude": "",
            "location_source_url": "",
            "match_confidence": "Pending",
        }
        for _, row in customer.iterrows()
    ],
    "yearly": [
        {
            "year": int(row["Year"]),
            "total_sales": float(row["total_sales"]),
            "total_tons": float(row["total_tons"]),
            "transactions": int(row["transactions"]),
        }
        for _, row in yearly.iterrows()
    ],
    "raw": [
        {
            "sr_date": row["SR Date"].strftime("%Y-%m-%d") if pd.notna(row["SR Date"]) else "",
            "party_code": "" if pd.isna(row["Party Code"]) else str(row["Party Code"]),
            "party_name": "" if pd.isna(row["Party Name"]) else str(row["Party Name"]),
            "total_tons": float(row["Total Tons"]),
            "sales_account": "" if pd.isna(row["Sales A/c"]) else str(row["Sales A/c"]),
            "lcy_net_amount": float(row["LCy Net Amount"]),
            "year": int(row["Year"]) if pd.notna(row["Year"]) else "",
        }
        for _, row in df.iterrows()
    ],
}

OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(json.dumps({k: payload[k] for k in ["row_count", "customer_count", "date_min", "date_max", "total_sales"]}, indent=2))
