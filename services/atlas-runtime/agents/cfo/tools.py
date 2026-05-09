from datetime import date, timedelta
from google.adk.tools import FunctionTool


def calculate_runway(cash_on_hand_usd: float, monthly_burn_usd: float) -> dict:
    """Calculate how many months of runway remain and the projected zero-cash date."""
    if monthly_burn_usd <= 0:
        return {"error": "monthly_burn_usd must be greater than 0"}
    months = cash_on_hand_usd / monthly_burn_usd
    zero_date = date.today() + timedelta(days=int(months * 30.44))
    return {
        "months_of_runway": round(months, 1),
        "zero_cash_date": zero_date.isoformat(),
        "cash_on_hand_usd": cash_on_hand_usd,
        "monthly_burn_usd": monthly_burn_usd,
    }


def calculate_mrr(num_customers: int, price_per_month_usd: float) -> dict:
    """Calculate MRR and ARR from customer count and monthly price."""
    mrr = num_customers * price_per_month_usd
    arr = mrr * 12
    return {
        "mrr_usd": round(mrr, 2),
        "arr_usd": round(arr, 2),
        "num_customers": num_customers,
        "price_per_month_usd": price_per_month_usd,
    }


def calculate_unit_economics(
    price_per_customer_usd: float,
    cogs_per_customer_usd: float,
    monthly_churn_rate_pct: float,
    acquisition_cost_per_customer_usd: float,
) -> dict:
    """Calculate LTV, CAC, LTV:CAC ratio, gross margin, and payback period."""
    if monthly_churn_rate_pct <= 0:
        return {"error": "monthly_churn_rate_pct must be greater than 0"}
    gross_margin_pct = ((price_per_customer_usd - cogs_per_customer_usd) / price_per_customer_usd) * 100
    avg_lifetime_months = 100 / monthly_churn_rate_pct
    ltv = (price_per_customer_usd - cogs_per_customer_usd) * avg_lifetime_months
    ltv_cac_ratio = ltv / acquisition_cost_per_customer_usd if acquisition_cost_per_customer_usd > 0 else None
    payback_months = (
        acquisition_cost_per_customer_usd / (price_per_customer_usd - cogs_per_customer_usd)
        if (price_per_customer_usd - cogs_per_customer_usd) > 0
        else None
    )
    return {
        "ltv_usd": round(ltv, 2),
        "cac_usd": round(acquisition_cost_per_customer_usd, 2),
        "ltv_cac_ratio": round(ltv_cac_ratio, 2) if ltv_cac_ratio else "N/A",
        "gross_margin_pct": round(gross_margin_pct, 1),
        "avg_lifetime_months": round(avg_lifetime_months, 1),
        "payback_period_months": round(payback_months, 1) if payback_months else "N/A",
    }


def calculate_break_even(
    monthly_fixed_costs_usd: float,
    price_per_unit_usd: float,
    variable_cost_per_unit_usd: float,
) -> dict:
    """Calculate break-even units and revenue per month."""
    contribution_margin = price_per_unit_usd - variable_cost_per_unit_usd
    if contribution_margin <= 0:
        return {"error": "price_per_unit must exceed variable_cost_per_unit"}
    break_even_units = monthly_fixed_costs_usd / contribution_margin
    break_even_revenue = break_even_units * price_per_unit_usd
    return {
        "break_even_units": round(break_even_units, 1),
        "break_even_revenue_usd": round(break_even_revenue, 2),
        "contribution_margin_per_unit_usd": round(contribution_margin, 2),
        "monthly_fixed_costs_usd": monthly_fixed_costs_usd,
    }


def project_revenue(current_mrr_usd: float, monthly_growth_rate_pct: float, months: int) -> dict:
    """Project MRR growth over N months at a given monthly growth rate."""
    if months < 1 or months > 60:
        return {"error": "months must be between 1 and 60"}
    projections = []
    mrr = current_mrr_usd
    for i in range(1, months + 1):
        mrr = mrr * (1 + monthly_growth_rate_pct / 100)
        target_date = date.today().replace(day=1) + timedelta(days=i * 30)
        projections.append({
            "month": i,
            "date": target_date.strftime("%Y-%m"),
            "mrr_usd": round(mrr, 2),
            "arr_usd": round(mrr * 12, 2),
        })
    return {
        "starting_mrr_usd": current_mrr_usd,
        "monthly_growth_rate_pct": monthly_growth_rate_pct,
        "final_mrr_usd": round(mrr, 2),
        "final_arr_usd": round(mrr * 12, 2),
        "projections": projections,
    }


runway_tool = FunctionTool(func=calculate_runway)
mrr_tool = FunctionTool(func=calculate_mrr)
unit_economics_tool = FunctionTool(func=calculate_unit_economics)
break_even_tool = FunctionTool(func=calculate_break_even)
revenue_projection_tool = FunctionTool(func=project_revenue)
