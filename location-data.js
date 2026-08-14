(function () {
  const states = [
    {
      name: "Lagos",
      center: [6.5244, 3.3792],
      lgas: ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
    },
    {
      name: "Abuja/FCT",
      center: [9.0765, 7.3986],
      lgas: ["Abaji", "Abuja Municipal Area Council", "Bwari", "Gwagwalada", "Kuje", "Kwali"],
    },
    {
      name: "Edo",
      center: [6.335, 5.6037],
      lgas: ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba-Okha", "Oredo", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
    },
    {
      name: "Ogun",
      center: [7.1608, 3.3483],
      lgas: ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Sagamu", "Yewa North", "Yewa South"],
    },
    {
      name: "Delta",
      center: [5.704, 5.9339],
      lgas: ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
    },
    {
      name: "Rivers",
      center: [4.8156, 7.0498],
      lgas: ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
    },
  ];

  const centers = {
    Lagos: { Ikeja: [6.6018, 3.3515], "Eti-Osa": [6.4698, 3.5852], "Lagos Mainland": [6.5167, 3.3833], Surulere: [6.5004, 3.3555] },
    "Abuja/FCT": { "Abuja Municipal Area Council": [9.0765, 7.3986], Bwari: [9.2799, 7.3806], Gwagwalada: [8.9434, 7.0917], Kuje: [8.8795, 7.2276] },
    Edo: { Oredo: [6.335, 5.6037], "Esan West": [6.743, 6.1403], "Etsako West": [7.0676, 6.2636] },
    Ogun: { "Abeokuta South": [7.1475, 3.3619], "Ado-Odo/Ota": [6.6924, 3.2365], "Ijebu Ode": [6.8161, 3.9159], Sagamu: [6.8322, 3.6319] },
    Delta: { "Warri South": [5.5167, 5.75], "Oshimili South": [6.2006, 6.7338], Sapele: [5.894, 5.6767], "Ughelli North": [5.4896, 6.0041] },
    Rivers: { "Port Harcourt": [4.8156, 7.0498], "Obio/Akpor": [4.8675, 7.0176], Bonny: [4.4522, 7.1681], Eleme: [4.7801, 7.1174] },
  };

  const legacyAliases = {
    Lagos: { Lekki: "Eti-Osa", Ajah: "Eti-Osa", Yaba: "Lagos Mainland" },
    "Abuja/FCT": { Wuse: "Abuja Municipal Area Council", Garki: "Abuja Municipal Area Council", Maitama: "Abuja Municipal Area Council", Gwarinpa: "Abuja Municipal Area Council", Lugbe: "Abuja Municipal Area Council" },
    Edo: { "Benin City": "Oredo", Ekpoma: "Esan West", Auchi: "Etsako West", Uromi: "Esan North-East" },
    Ogun: { Abeokuta: "Abeokuta South", "Sango Ota": "Ado-Odo/Ota" },
    Delta: { Warri: "Warri South", Asaba: "Oshimili South", Ughelli: "Ughelli North" },
    Rivers: { "Obio-Akpor": "Obio/Akpor" },
  };

  const normalizeLga = (state, value) => legacyAliases[state]?.[value] || value;

  window.FIXAM_LOCATIONS = { states, centers, legacyAliases, normalizeLga };
})();
