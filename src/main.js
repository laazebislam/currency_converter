/* --------------Variable -------------- */

let all_cur,
    indexer = 0,
    cur_rates = {},
    s = [], // cur_result as an array
    select1 = document.getElementById("cur1"),
    select2 = document.getElementById("cur2"),
    amount = document.getElementById("amount"),
    output = document.getElementById("result"),
    alert = document.getElementById("error"),
    change = document.getElementById("change");

/* --------------intialize IDB database-------------- */

if (!('indexedDB' in window)) {
    console.log('This browser doesn\'t support IndexedDB');
} else {
    var dbPromised = idb.open("all_cur", 1, upgradeDb => {
        if (!upgradeDb.objectStoreNames.contains('cur')) {
            upgradeDb.createObjectStore('cur');
            upgradeDb.createObjectStore('cur_value');
        }
    });
}

/* -------------- a promise that wait for requesting the currency -------------- */

let load = new Promise((res, rej) => {
    dbPromised.then(db => {
        let tx = db.transaction("cur", "readonly");
        tx.objectStore("cur").get("currency").then(x => {
            if (x) {
                all_cur = x;
                res()
            } else {
                fetch("https://free.currencyconverterapi.com/api/v5/currencies").then(x => {
                        return x.json();
                    }).then(y => {
                        all_cur = y.results;
                        dbPromised.then(db => {
                            let tx = db.transaction("cur", "readwrite");
                            tx.objectStore("cur").put(all_cur, "currency");
                            res();
                        });
                    })
                    .catch(err => {
                        console.log("Failed when retrivng currencies: ", err);
                        rej();
                    })
            }
        });
    });
});

/* -------------- after getting all curency from api or idb -------------- */
load.then(_ => {

    // add all curency to an array 
    Object.keys(all_cur).sort().forEach((x, y) => {
        s[y] = all_cur[x];
    });
    // add currency to the HTML select
    s.forEach(x => {
        let opt = document.createElement("option"),
            opt2 = document.createElement("option");
        opt.innerHTML = x.id + " - " + x.currencyName;
        opt.value = x.id;
        if (x.id == "USD") {
            opt.setAttribute("selected", true);
        }
        opt2.innerHTML = x.id + " - " + x.currencyName;
        opt2.value = x.id;
        if (x.id == "EUR") {
            opt2.setAttribute("selected", true);
        }
        select1.appendChild(opt);
        select2.appendChild(opt2);

    });

    // check if rates are avaliable and then add it to the global variable or get it
    dbPromised.then(Db => {
        let tx = Db.transaction("cur_value", "readonly");
        tx.objectStore("cur_value").get("rates").then(x => {
            if (x) {
                if (new Date() - x.time > 0) {
                    getter();
                    return;
                }
                cur_rates = x.data;
                active_event();
            } else {
                getter();
            }

        });
    });
});
/* -------------- get all the currency rates and store it in the idb -------------- */

let getter = () => {

    while (indexer < 156) {
        let d = 'USD_' + s[indexer++].id,
            e = 'USD_' + s[indexer++].id,
            api = `https://free.currencyconverterapi.com/api/v5/convert?q=${d},${e}&compact=ultra`;

        fetch(api).then(x => {
                if (!x.ok) {
                    throw Error("server down");
                }
                return x.json();
            })
            .then(y => {
                cur_rates[d] = y[d];
                cur_rates[e] = y[e];
                // when we get all currency_rates we add it to the idb
                if (Object.keys(cur_rates).length == 156) {
                    dbPromised.then(db => {
                        let tx = db.transaction("cur_value", "readwrite");
                        tx.objectStore("cur_value").put({
                            time: new Date().setHours(new Date().getHours() + 1),
                            data: cur_rates
                        }, "rates");
                        active_event();
                    });
                }
            })
            .catch(_ => {
                console.log("api or internet problem");
            })
    }

};
/* -------------- calculate the result and show it -------------- */

let calc_result = () => {
    if (isNaN(amount.value) || parseFloat(amount.value) * 10 < 0) {
        alert.style.display = "block";
        return;
    }
    alert.style.display = "none";
    let src = "USD_" + select1.value,
        out = "USD_" + select2.value,
        rate = cur_rates[out] / cur_rates[src],
        reg_amount = amount.value || 0;
    output.innerHTML = `${reg_amount}  ${select1.value} =  <span>${(rate * amount.value).toFixed(3)}</span>  ${select2.value}`;
};

/* -------------- active event listener on input  and the select-------------- */

let active_event = _ => {
    amount.onkeyup = _ => {
        calc_result();
    };
    select1.onchange = _ => {
        calc_result();
    };
    select2.onchange = _ => {
        calc_result();
    };
    change.onclick = _ => {
        let p = select1.selectedIndex;
        select1.options[select2.selectedIndex].setAttribute("selected", true);
        select2.options[p].setAttribute("selected", true);
    }
}