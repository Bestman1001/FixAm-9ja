(function () {
  // LGA focus points are derived from GRID3 Nigeria ADM2 boundaries distributed by geoBoundaries under CC BY 4.0.
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
    Lagos: {
      Agege: [6.62394, 3.31618], "Ajeromi-Ifelodun": [6.45544, 3.33719], Alimosho: [6.57402, 3.25561], "Amuwo-Odofin": [6.43663, 3.27854], Apapa: [6.4355, 3.37097], Badagry: [6.44098, 2.91464], Epe: [6.5538, 3.96937], "Eti-Osa": [6.45274, 3.54334], "Ibeju-Lekki": [6.4555, 3.9006], "Ifako-Ijaiye": [6.66358, 3.30939], Ikeja: [6.60327, 3.34948], Ikorodu: [6.61193, 3.56717], Kosofe: [6.60176, 3.3997], "Lagos Island": [6.45385, 3.39497], "Lagos Mainland": [6.50041, 3.38304], Mushin: [6.53196, 3.34978], Ojo: [6.45547, 3.15734], "Oshodi-Isolo": [6.53897, 3.31341], Shomolu: [6.53812, 3.38308], Surulere: [6.49292, 3.34651],
    },
    "Abuja/FCT": {
      Abaji: [8.89105, 6.85128], "Abuja Municipal Area Council": [8.94289, 7.40623], Bwari: [9.24336, 7.48702], Gwagwalada: [9.07157, 7.02712], Kuje: [8.66712, 7.24346], Kwali: [8.74502, 6.97589],
    },
    Edo: {
      "Akoko-Edo": [7.36306, 6.13393], Egor: [6.35677, 5.58202], "Esan Central": [6.72454, 6.25093], "Esan North-East": [6.77235, 6.39407], "Esan South-East": [6.58762, 6.47246], "Esan West": [6.66637, 6.13707], "Etsako Central": [6.97683, 6.5102], "Etsako East": [7.19851, 6.50554], "Etsako West": [6.99375, 6.30815], Igueben: [6.51495, 6.2423], "Ikpoba-Okha": [6.15927, 5.64819], Oredo: [6.22508, 5.55242], Orhionmwon: [6.06355, 6.00572], "Ovia North-East": [6.48561, 5.53396], "Ovia South-West": [6.4881, 5.27043], "Owan East": [7.0451, 6.05782], "Owan West": [6.92114, 5.89844], Uhunmwonde: [6.49824, 5.90315],
    },
    Ogun: {
      "Abeokuta North": [7.23878, 3.16917], "Abeokuta South": [7.17734, 3.3602], "Ado-Odo/Ota": [6.62229, 3.08659], Ewekoro: [6.96141, 3.18662], Ifo: [6.77716, 3.25736], "Ijebu East": [6.82587, 4.273], "Ijebu North": [7.01399, 4.00776], "Ijebu North East": [6.88167, 4.02118], "Ijebu Ode": [6.75502, 3.9644], Ikenne: [6.90803, 3.67567], "Imeko Afon": [7.59029, 2.86774], Ipokia: [6.62431, 2.79869], "Obafemi Owode": [7.01207, 3.50112], Odeda: [7.31149, 3.50327], Odogbolu: [6.77858, 3.8078], "Ogun Waterside": [6.49724, 4.41253], "Remo North": [7.00886, 3.73257], Sagamu: [6.77863, 3.57477], "Yewa North": [7.10804, 2.90474], "Yewa South": [6.78751, 2.94996],
    },
    Delta: {
      "Aniocha North": [6.36269, 6.48129], "Aniocha South": [6.13422, 6.48439], Bomadi: [5.23725, 5.82172], Burutu: [5.22641, 5.57906], "Ethiope East": [5.68904, 5.99337], "Ethiope West": [5.91975, 5.75207], "Ika North East": [6.22711, 6.29368], "Ika South": [6.18459, 6.19759], "Isoko North": [5.53089, 6.23556], "Isoko South": [5.38553, 6.22192], "Ndokwa East": [5.68595, 6.51052], "Ndokwa West": [5.8017, 6.34239], Okpe: [5.68528, 5.78993], "Oshimili North": [6.3152, 6.64518], "Oshimili South": [6.09469, 6.6766], Patani: [5.17475, 6.102], Sapele: [5.85197, 5.62635], Udu: [5.47616, 5.82407], "Ughelli North": [5.49539, 6.05519], "Ughelli South": [5.3451, 5.90338], Ukwuani: [5.84473, 6.25213], Uvwie: [5.57743, 5.77882], "Warri North": [5.85904, 5.24375], "Warri South": [5.61021, 5.61954], "Warri South West": [5.55403, 5.44258],
    },
    Rivers: {
      "Abua/Odual": [4.82879, 6.56407], "Ahoada East": [5.06438, 6.63928], "Ahoada West": [5.02567, 6.51091], "Akuku-Toru": [4.53505, 6.68029], Andoni: [4.50948, 7.39988], "Asari-Toru": [4.74202, 6.84704], Bonny: [4.4469, 7.23894], Degema: [4.55312, 6.9104], Eleme: [4.78649, 7.13691], Emohua: [5.01054, 6.77867], Etche: [5.09202, 7.08309], Gokana: [4.64839, 7.28884], Ikwerre: [5.06909, 6.8916], Khana: [4.69396, 7.42845], "Obio/Akpor": [4.86622, 6.99787], "Ogba/Egbema/Ndoni": [5.39765, 6.6318], "Ogu/Bolo": [4.63668, 7.20706], Okrika: [4.60388, 7.07324], Omuma: [5.08659, 7.23216], "Opobo/Nkoro": [4.52945, 7.5086], Oyigbo: [4.83432, 7.30165], "Port Harcourt": [4.78574, 7.01771], Tai: [4.75412, 7.25545],
    },
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
