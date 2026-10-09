Deno.serve((req) => {
  if (req.method !== "GET")
    return new Response("Method not allowed", { status: 405 });
  return new Response(null, {
    status: 302,
    headers: {
      Location: "fittrack://payment-return",
      "Cache-Control": "no-store",
    },
  });
});
