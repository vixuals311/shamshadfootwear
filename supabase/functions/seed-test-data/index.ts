import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Brands - insert ignoring duplicates
    const brandNames = ["Nike", "Adidas", "Bata", "Servis", "ECS", "Hush Puppies", "Stylo", "Metro"];
    for (const name of brandNames) {
      await supabase.from("brands").insert({ name }).select();
    }
    const { data: allBrands } = await supabase.from("brands").select("*");

    // 2. Product Categories
    const categories = ["Formal", "Casual", "Sports", "Sandals", "Slippers"];
    for (let i = 0; i < categories.length; i++) {
      await supabase.from("product_categories").insert({ name: categories[i], display_order: i });
    }

    // 3. Products (24 products across brands)
    const productData = [
      { name: "Air Max Runner", article: "NKE-001", brand: "Nike", cat: "Sports", gender: "men" },
      { name: "Classic Court", article: "NKE-002", brand: "Nike", cat: "Casual", gender: "men" },
      { name: "Ultra Boost", article: "ADS-001", brand: "Adidas", cat: "Sports", gender: "men" },
      { name: "Stan Smith", article: "ADS-002", brand: "Adidas", cat: "Casual", gender: "unisex" },
      { name: "Superstar", article: "ADS-003", brand: "Adidas", cat: "Casual", gender: "women" },
      { name: "Power Perfect", article: "BTA-001", brand: "Bata", cat: "Formal", gender: "men" },
      { name: "Comfit Ladies", article: "BTA-002", brand: "Bata", cat: "Casual", gender: "women" },
      { name: "School Champion", article: "BTA-003", brand: "Bata", cat: "Formal", gender: "children" },
      { name: "Cheetah Sport", article: "SRV-001", brand: "Servis", cat: "Sports", gender: "men" },
      { name: "Don Carlos", article: "SRV-002", brand: "Servis", cat: "Formal", gender: "men" },
      { name: "Ladies Comfort", article: "SRV-003", brand: "Servis", cat: "Sandals", gender: "women" },
      { name: "Elegance Heel", article: "ECS-001", brand: "ECS", cat: "Formal", gender: "women" },
      { name: "Party Wear", article: "ECS-002", brand: "ECS", cat: "Formal", gender: "women" },
      { name: "Oxford Classic", article: "HSH-001", brand: "Hush Puppies", cat: "Formal", gender: "men" },
      { name: "Loafer Premium", article: "HSH-002", brand: "Hush Puppies", cat: "Casual", gender: "men" },
      { name: "Stiletto Gold", article: "STY-001", brand: "Stylo", cat: "Formal", gender: "women" },
      { name: "Flat Comfort", article: "STY-002", brand: "Stylo", cat: "Casual", gender: "women" },
      { name: "Kids Runner", article: "STY-003", brand: "Stylo", cat: "Sports", gender: "children" },
      { name: "Metro Formal", article: "MTR-001", brand: "Metro", cat: "Formal", gender: "men" },
      { name: "Metro Sandal", article: "MTR-002", brand: "Metro", cat: "Sandals", gender: "women" },
      { name: "Jogger Pro", article: "NKE-003", brand: "Nike", cat: "Sports", gender: "unisex" },
      { name: "Slide Comfort", article: "ADS-004", brand: "Adidas", cat: "Slippers", gender: "unisex" },
      { name: "Baby Steps", article: "BTA-004", brand: "Bata", cat: "Casual", gender: "children" },
      { name: "Trekker", article: "SRV-004", brand: "Servis", cat: "Sports", gender: "men" },
    ];

    const brandMap: Record<string, string> = {};
    for (const b of allBrands || []) {
      brandMap[b.name] = b.id;
    }

    const productsToInsert = productData.map(p => ({
      name: p.name,
      article_number: p.article,
      brand_id: brandMap[p.brand] || null,
      category: p.cat,
      gender: p.gender as "men" | "women" | "children" | "unisex",
      stock_dozens: Math.floor(Math.random() * 50) + 5,
      pairs_per_dozen: 12,
    }));

    for (const p of productsToInsert) {
      await supabase.from("products").insert(p);
    }
    const { data: allProducts } = await supabase.from("products").select("*");

    // 4. Size bundles for each product
    const sizeRanges = [
      { range: "7-10", pairs: 6, priceBase: 800 },
      { range: "4-6", pairs: 6, priceBase: 700 },
      { range: "1-3", pairs: 6, priceBase: 600 },
    ];

    for (const prod of allProducts || []) {
      const bundles = sizeRanges.map(sr => ({
        product_id: prod.id,
        size_range: sr.range,
        pairs_per_bundle: sr.pairs,
        price_per_pair: sr.priceBase + Math.floor(Math.random() * 500),
        quantity: Math.floor(Math.random() * 30) + 2,
      }));
      await supabase.from("product_size_bundles").insert(bundles);
    }

    // 5. Clients (25 clients across Pakistani cities)
    const cities = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot"];
    const clientsData = [
      { name: "Ahmed Traders", city: "Lahore", phone: "0321-1234567", balance: 15000 },
      { name: "Bilal Footwear", city: "Karachi", phone: "0333-2345678", balance: 25000 },
      { name: "Crescent Shoes", city: "Islamabad", phone: "0300-3456789", balance: 0 },
      { name: "Deen Brothers", city: "Faisalabad", phone: "0312-4567890", balance: 8000 },
      { name: "Eagle Enterprises", city: "Multan", phone: "0345-5678901", balance: 42000 },
      { name: "Fahad Collection", city: "Peshawar", phone: "0331-6789012", balance: 5500 },
      { name: "Ghani & Sons", city: "Lahore", phone: "0322-7890123", balance: 18000 },
      { name: "Hassan Shoes", city: "Sialkot", phone: "0301-8901234", balance: 0 },
      { name: "Iqbal Mart", city: "Lahore", phone: "0313-9012345", balance: 32000 },
      { name: "Junaid Footwear", city: "Karachi", phone: "0346-0123456", balance: 12000 },
      { name: "Kamran Traders", city: "Faisalabad", phone: "0334-1122334", balance: 7500 },
      { name: "Lucky Shoes", city: "Quetta", phone: "0302-2233445", balance: 0 },
      { name: "Madina Enterprises", city: "Multan", phone: "0323-3344556", balance: 55000 },
      { name: "Noman Collection", city: "Islamabad", phone: "0335-4455667", balance: 3000 },
      { name: "Omar Footwear", city: "Lahore", phone: "0314-5566778", balance: 21000 },
      { name: "Pakistan Shoes", city: "Karachi", phone: "0347-6677889", balance: 0 },
      { name: "Qadir & Co", city: "Peshawar", phone: "0303-7788990", balance: 9800 },
      { name: "Rehman Traders", city: "Sialkot", phone: "0324-8899001", balance: 44000 },
      { name: "Siddiqui Brothers", city: "Faisalabad", phone: "0336-9900112", balance: 6000 },
      { name: "Tariq Shoes", city: "Lahore", phone: "0315-0011223", balance: 0 },
      { name: "Usman Enterprises", city: "Multan", phone: "0348-1122334", balance: 28000 },
      { name: "Waqas Collection", city: "Karachi", phone: "0304-2233445", balance: 15500 },
      { name: "Yaseen Footwear", city: "Quetta", phone: "0325-3344556", balance: 0 },
      { name: "Zahid & Sons", city: "Islamabad", phone: "0337-4455667", balance: 37000 },
      { name: "Ali Traders", city: "Lahore", phone: "0316-5566778", balance: 11000 },
    ];

    const clientsToInsert = clientsData.map(c => ({
      name: c.name,
      phone: c.phone,
      city: c.city,
      address: `Main Bazaar, ${c.city}`,
      email: `${c.name.toLowerCase().replace(/[^a-z]/g, "")}@example.com`,
      opening_balance: c.balance,
      current_balance: c.balance,
      total_spent: Math.floor(Math.random() * 200000) + 10000,
      invoice_count: 0,
    }));

    const { data: clients } = await supabase.from("clients").insert(clientsToInsert).select();
    const allClients = clients || [];

    // 6. Invoices & items for clients
    let invoiceNum = 1000;
    for (const client of allClients) {
      const numInvoices = Math.floor(Math.random() * 4) + 1; // 1-4 invoices per client
      for (let i = 0; i < numInvoices; i++) {
        invoiceNum++;
        const numItems = Math.floor(Math.random() * 3) + 1;
        let subtotal = 0;
        let totalDiscount = 0;
        let totalBundles = 0;
        const items: Array<{
          product_name: string;
          article_number: string;
          brand_name: string;
          size_range: string;
          quantity: number;
          total_pairs: number;
          price_per_pair: number;
          discount_per_pair: number;
          total: number;
        }> = [];

        for (let j = 0; j < numItems; j++) {
          if (!allProducts || allProducts.length === 0) break;
          const prod = allProducts[Math.floor(Math.random() * allProducts.length)];
          const brand = (allBrands || []).find(b => b.id === prod.brand_id);
          const sr = sizeRanges[Math.floor(Math.random() * sizeRanges.length)];
          const qty = Math.floor(Math.random() * 5) + 1;
          const pairs = qty * sr.pairs;
          const price = sr.priceBase + Math.floor(Math.random() * 400);
          const disc = Math.random() > 0.5 ? Math.floor(Math.random() * 50) : 0;
          const itemTotal = pairs * (price - disc);
          subtotal += pairs * price;
          totalDiscount += pairs * disc;
          totalBundles += qty;
          items.push({
            product_name: prod.name,
            article_number: prod.article_number,
            brand_name: brand?.name || "Unknown",
            size_range: sr.range,
            quantity: qty,
            total_pairs: pairs,
            price_per_pair: price,
            discount_per_pair: disc,
            total: itemTotal,
          });
        }

        const total = subtotal - totalDiscount;
        const amountReceived = Math.random() > 0.3 ? total : Math.floor(total * 0.6);
        const balanceDue = total - amountReceived;
        const status = balanceDue === 0 ? "paid" : amountReceived > 0 ? "partial" : "sent";
        const daysAgo = Math.floor(Math.random() * 60);
        const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

        const { data: inv } = await supabase.from("invoices").insert({
          invoice_number: `INV-${invoiceNum}`,
          client_id: client.id,
          subtotal,
          total_discount: totalDiscount,
          tax: 0,
          total,
          amount_received: amountReceived,
          balance_due: balanceDue,
          payment_method: Math.random() > 0.5 ? "cash" : "account",
          status,
          total_bundles: totalBundles,
          created_at: createdAt,
        }).select().single();

        if (inv) {
          await supabase.from("invoice_items").insert(
            items.map(item => ({ ...item, invoice_id: inv.id }))
          );
        }
      }

      // Update client invoice count
      await supabase.from("clients").update({ invoice_count: numInvoices }).eq("id", client.id);
    }

    // 7. Some recoveries
    for (let i = 0; i < 15; i++) {
      const client = allClients[Math.floor(Math.random() * allClients.length)];
      const amount = Math.floor(Math.random() * 20000) + 1000;
      const daysAgo = Math.floor(Math.random() * 30);
      await supabase.from("recoveries").insert({
        client_id: client.id,
        amount,
        type: "client",
        date: new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0],
        notes: `Recovery payment from ${client.name}`,
      });
    }

    // 8. Payment accounts
    const payAccounts = ["JazzCash", "EasyPaisa", "Bank Alfalah", "HBL", "Cash Counter"];
    for (const name of payAccounts) {
      await supabase.from("payment_accounts").insert({ name });
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          brands: allBrands?.length || 0,
          products: allProducts?.length || 0,
          clients: allClients.length,
          invoices: invoiceNum - 1000,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
