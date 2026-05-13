// supabaseClient.js

const SUPABASE_URL = "https://ftssllxdkqvmlxhfeqmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_HoB7ioTMmxpNon3921W7YQ_AZ8wjb9b";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadOperators() {
    const { data, error } = await supabaseClient
        .from("operators")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("name");

    if (error) {
        console.error("Fehler beim Laden:", error);
        return;
    }

    console.log("Operators:", data);
}

loadOperators();