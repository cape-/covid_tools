var covidStatsNgApp = angular
    .module("covidStats", ['ngMaterial'])
    .config(function ($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .primaryPalette('pink')
            .accentPalette('orange');
    })
    .controller("statsMain", function ($scope, $rootScope, $filter, $interval, $mdDialog, $http) {

        $scope.state = 'Iniciando...';
        $scope.statsdb = {};
        $scope.localStorageTTL = 1 * 60 * 60 * 1000; // 1 hora

        /* PARAMS */
        $scope.params = {
            idxMuestreoMin: 5,
            indicadorMinD40: true,
            indicadorMinD80: false,
            indicadorMinD150: false,
        };

        $scope.updateStats = function () {

            $scope.state = 'Obteniendo estadísticas...'

            if ((Date.now() - localStorage.getItem('statsTS')) < $scope.localStorageTTL) {
                $scope.statsdb = JSON.parse(localStorage.getItem('statsdb'));

                return;
            }

            $http({
                method: "GET",
                url: "https://pomber.github.io/covid19/timeseries.json",
                headers: {},
                data: {}
            })
                .then(response => {
                    $scope.paises = Object.keys(response.data).sort();
                    $scope.statsdb = $scope.paises.map((pais) => {
                        var prevData = {
                            "d1": 0,
                            "d2": 0,
                            "d5": 0,
                            "d10": 0,
                            "d20": 0,
                            "d40": 0,
                            "d80": 0,
                            "d150": 0,
                            "d300": 0,
                            "d600": 0,
                            "d1200": 0,
                            "confirmed": 0,
                            "deaths": 0,
                            "recovered": 0
                        }

                        return {
                            "pais": pais,
                            "data": response.data[pais].map((d) => {

                                d.confirmed = isNaN(d.confirmed) ? prevData.confirmed : d.confirmed;
                                d.deaths = isNaN(d.deaths) ? prevData.deaths : d.deaths;
                                d.recovered = isNaN(d.recovered) ? prevData.recovered : d.recovered;

                                if (d.confirmed > 0)
                                    prevData.d1++;
                                if (d.confirmed > 1)
                                    prevData.d2++;
                                if (d.confirmed > 4)
                                    prevData.d5++;
                                if (d.confirmed > 9)
                                    prevData.d10++;
                                if (d.confirmed > 19)
                                    prevData.d20++;
                                if (d.confirmed > 39)
                                    prevData.d40++;
                                if (d.confirmed > 79)
                                    prevData.d80++;
                                if (d.confirmed > 149)
                                    prevData.d150++;
                                if (d.confirmed > 299)
                                    prevData.d300++;
                                if (d.confirmed > 599)
                                    prevData.d600++;
                                if (d.confirmed > 1199)
                                    prevData.d1200++;

                                var returnObj = {
                                    "date": d.date,
                                    "dateObj": new Date(d.date.split('-')[0], (d.date.split('-')[1] - 1), d.date.split('-')[2]),
                                    "d1": prevData.d1,
                                    "d2": prevData.d2,
                                    "d5": prevData.d5,
                                    "d10": prevData.d10,
                                    "d20": prevData.d20,
                                    "d40": prevData.d40,
                                    "d80": prevData.d80,
                                    "d150": prevData.d150,
                                    "d300": prevData.d300,
                                    "d600": prevData.d600,
                                    "d1200": prevData.d1200,

                                    "confirmed": d.confirmed,
                                    "varConfirmed": d.confirmed - prevData.confirmed,
                                    "percentConfirmed": ((d.confirmed / prevData.confirmed) - 1) * 100,

                                    "deaths": d.deaths,
                                    "varDeaths": d.deaths - prevData.deaths,
                                    "percentDeaths": ((d.deaths / prevData.deaths) - 1) * 100,

                                    "recovered": d.recovered,
                                    "varRecovered": d.recovered - prevData.recovered,
                                    "percentRecovered": ((d.recovered / prevData.recovered) - 1) * 100,
                                }
                                prevData.confirmed = d.confirmed;
                                prevData.deaths = d.deaths;
                                prevData.recovered = d.recovered;

                                return returnObj;
                            }),
                            "d1": prevData.d1,
                            "d2": prevData.d2,
                            "d5": prevData.d5,
                            "d10": prevData.d10,
                            "d20": prevData.d20,
                            "d40": prevData.d40,
                            "d80": prevData.d80,
                            "d150": prevData.d150,
                            "d300": prevData.d300,
                            "d600": prevData.d600,
                            "d1200": prevData.d1200,

                        }
                    });
                    localStorage.setItem('statsdb', JSON.stringify($scope.statsdb));
                    localStorage.setItem('statsTS', Date.now());

                })
                .catch(err => {
                    console.log(err);
                    console.log('Recuperandod stats DB desde localStorage');
                    $scope.statsdb = JSON.parse(localStorage.getItem('statsdb'));

                });
        };

        $scope.watchCalls = 0;

        $scope.deregisterWatchStatsdb = $scope.$watchCollection('statsdb', function () {
            // LOG //
            console.log("watch statsdb call ", ++$scope.watchCalls);

            if (angular.equals($scope.statsdb, {}))
                return;

            window.paises = $scope.paises;
            window.statsdb = $scope.statsdb;


            setTimeout(() => { $scope.state = 'Procesando estadísticas...'; $scope.$apply() }, 100);

            setTimeout(() => {
                // FOR EACH PAIS
                for (let i = 0; i < $scope.statsdb.length; i++) {
                    var currPais = $scope.statsdb[i];

                    if ((currPais.d40 < 1) && $scope.params.indicadorMinD40) {
                        // LOG //
                        // console.log(currPais.pais + " Descartado por D40 < 1");
                        continue;
                    }
                    if ((currPais.d80 < 1) && $scope.params.indicadorMinD80) {
                        // LOG //
                        // console.log(currPais.pais + " Descartado por D80 < 1");
                        continue;
                    }
                    if ((currPais.d150 < 1) && $scope.params.indicadorMinD150) {
                        // LOG //
                        // console.log(currPais.pais + " Descartado por D150 < 1");
                        continue;
                    }

                    // LOG //
                    console.log("Procesando " + currPais.pais);

                    currPais.comparativo = []; // ANÁLISIS COMPARATIVO
                    currPais.min = {}; // VALORES MÍNIMOS

                    // COMPARAMOS CONTRA CADA OTRO PAIS (TARGET)
                    for (let j = 0; j < $scope.statsdb.length; j++) {
                        var tgtPais = $scope.statsdb[j];

                        if (currPais.pais === tgtPais.pais) // Evitar comparar contra si mismo
                            continue;

                        if ((tgtPais.d40 < 1) && $scope.params.indicadorMinD40) {
                            // LOG //
                            // console.log(tgtPais.pais + " Descartado por D40 < 1");
                            continue;
                        }
                        if ((tgtPais.d80 < 1) && $scope.params.indicadorMinD80) {
                            // LOG //
                            // console.log(tgtPais.pais + " Descartado por D80 < 1");
                            continue;
                        }
                        if ((tgtPais.d150 < 1) && $scope.params.indicadorMinD150) {
                            // LOG //
                            // console.log(tgtPais.pais + " Descartado por D150 < 1");
                            continue;
                        }

                        // LOG //
                        // console.log("Procesando " + currPais.pais + " vs " + tgtPais.pais);

                        currPais.comparativo[tgtPais.pais] = $scope.compararCurvas(currPais.data, tgtPais.data);

                        // LOG //
                        // console.log("Procesando " + currPais.pais + " vs " + tgtPais.pais + "obteniendo MINIMOS");

                        currPais.comparativo[tgtPais.pais].results.forEach((d) => {
                            if (angular.equals(currPais.min, {})) {
                                // LOG //
                                // console.log("Reseteando MINIMOS");

                                currPais.min.rateDiffConfirmed = d;
                                currPais.min.rateDiffDeath = d;
                                currPais.min.rateDiffRecovered = d;
                                currPais.min.sumDeltaConfirmed = d;
                                currPais.min.sumDeltaDeaths = d;
                                currPais.min.sumDeltaRecovered = d;
                            }

                            if (d.rateDiffConfirmed < currPais.min.rateDiffConfirmed.rateDiffConfirmed) {
                                currPais.min.rateDiffConfirmed = d;
                                currPais.min.rateDiffConfirmed.pais = tgtPais.pais;
                            }
                            if (d.rateDiffDeath < currPais.min.rateDiffDeath.rateDiffDeath) {
                                currPais.min.rateDiffDeath = d;
                                currPais.min.rateDiffDeath.pais = tgtPais.pais;
                            }
                            if (d.rateDiffRecovered < currPais.min.rateDiffRecovered.rateDiffRecovered) {
                                currPais.min.rateDiffRecovered = d;
                                currPais.min.rateDiffRecovered.pais = tgtPais.pais;
                            }
                            if (d.sumDeltaConfirmed < currPais.min.sumDeltaConfirmed.sumDeltaConfirmed) {
                                currPais.min.sumDeltaConfirmed = d;
                                currPais.min.sumDeltaConfirmed.pais = tgtPais.pais;
                            }
                            if (d.sumDeltaDeaths < currPais.min.sumDeltaDeaths.sumDeltaDeaths) {
                                currPais.min.sumDeltaDeaths = d;
                                currPais.min.sumDeltaDeaths.pais = tgtPais.pais;
                            }
                            if (d.sumDeltaRecovered < currPais.min.sumDeltaRecovered.sumDeltaRecovered) {
                                currPais.min.sumDeltaRecovered = d;
                                currPais.min.sumDeltaRecovered.pais = tgtPais.pais;
                            }
                        }); // FOR EACH RESULTS (REGISTRAR MINIMOS)

                    }; // FOR EACH TARGET PAIS

                }; // FOR EACH CURRENT PAIS
            }, 1000);

            // setTimeout(() => { $scope.state = 'Estadísticas Procesadas Ok!'; $scope.$apply() }, 100);

            // setTimeout(() => { $scope.state = 'Listo'; $scope.$apply() }, 3000);

            $scope.$apply();

        });

        $scope.compararCurvas = function (currentPaisData, tgtPaisData) {
            var returnObj = {
                results: []
            }
            var currentPDataIxD1 = currentPaisData.findIndex(d => d.d1 >= 1); // CURRENT PAIS DATA INDEX D1
            var tgtPDataIxD1 = tgtPaisData.findIndex(d => d.d1 >= 1); // TARGET PAIS DATA INDEX D1

            if ((currentPDataIxD1 === -1) || (tgtPDataIxD1 === -1))
                return;

            // console.log("compararCurvas");

            for (let offset = -10; offset <= 10; offset++) { // SHIFTING DE LAS CURVAS +/- 10 DÍAS  DESDE D1=D1

                if (((tgtPDataIxD1 + offset) < 0) || ((tgtPDataIxD1 + offset) >= tgtPaisData.length)) // DESCARTANDO SHIFT IMPOSIBLE
                    continue;

                var cursorCurP = currentPDataIxD1; // CURSOR CURRENT PAIS
                var cursorTgtP = tgtPDataIxD1 + offset; // CURSOR TARGET PAIS
                var sumDeltaConfirmed = sumDeltaDeaths = sumDeltaRecovered = 0; // RESET CONTADORES
                var idxMuestreo = 0;

                // RECORRER ARRAYS EN PARALELO
                while ((cursorTgtP < tgtPaisData.length) && (cursorCurP < currentPaisData.length)) {
                    var curDiaData = currentPaisData[cursorCurP++];
                    var tgtDiaData = tgtPaisData[cursorTgtP++];

                    idxMuestreo++;

                    sumDeltaConfirmed += Math.abs(curDiaData.confirmed - tgtDiaData.confirmed);
                    sumDeltaDeaths += Math.abs(curDiaData.deaths - tgtDiaData.deaths);
                    sumDeltaRecovered += Math.abs(curDiaData.recovered - tgtDiaData.recovered);
                }

                var rateDiffConfirmed = sumDeltaConfirmed / idxMuestreo;
                var rateDiffDeath = sumDeltaConfirmed / idxMuestreo;
                var rateDiffRecovered = sumDeltaConfirmed / idxMuestreo;

                if (idxMuestreo > $scope.params.idxMuestreoMin)
                    returnObj.results.push({
                        "type": "D1=D1",
                        "offset": offset,
                        "sumDeltaConfirmed": sumDeltaConfirmed,
                        "sumDeltaDeaths": sumDeltaDeaths,
                        "sumDeltaRecovered": sumDeltaRecovered,
                        "rateDiffConfirmed": rateDiffConfirmed,
                        "rateDiffDeath": rateDiffDeath,
                        "rateDiffRecovered": rateDiffRecovered,
                        "idxMuestreo": idxMuestreo
                    })

            }
            return returnObj;
        };

        class clProporciones {
            constructor(o) {
                this.p = o.p;
                this.f = o.f;
            }
        }
        /*
        .load fn_simplificar.js
        */

        $scope.simplificar = function (x, y, z) {
            var mayor,
                menor,
                retArr = [];
            if ((x >= y) && (x >= z))
                mayor = x;
            else if ((y >= x) && (y >= z))
                mayor = y;
            else
                mayor = z;

            if ((x <= y) && (x <= z))
                menor = x;
            else if ((y <= x) && (y <= z))
                menor = y;
            else
                menor = z;

            console.log(mayor, menor);
            var potencia = mayor.toString().length - 1;
            var potenciam = menor.toString().length - 1;
            console.log(potencia, potenciam);

            for (let i = potenciam; i <= potencia; i++) {
                var base = Math.pow(10, i);
                retArr.push(new clProporciones({
                    p: i,
                    f: [Math.round(x / base),
                    Math.round(y / base),
                    Math.round(z / base)]
                }));
            }

            return retArr;
        }

        $scope.globalProporcionesData = [];

        $scope.sacarProporcionesPais = function (pais) {
            pais.proporciones = simplificar(pais.confirmed, pais.recovered, pais.death);
            pais.proporciones.map((o) => { o.pais = pais.pais });
            globalProporcionesData.concat([pais.proporciones]);
        };

        $scope.analizarProporcionesData = function (pData) {
            pData.sort((p, q) => (p.p - q.p));
        };


        /** 
        ----
        ----
        ---
        --
        -
        */
        $scope.mediana = function (v) {
            if (v.length === 0) return 0;

            v.sort((a, b) => a - b);

            var half = Math.floor(v.length / 2);

            if (v.length % 2)
                return v[half];

            return (v[half - 1] + v[half]) / 2.0;
        }

        $scope.compararPaises = function (statsdb) {
            $mdDialog.show({
                controller: ComparativoController,
                templateUrl: 'paisescomparativo.tmpl.html',
                parent: angular.element(document.body),
                /* targetEvent: ev, */
                clickOutsideToClose: true
            })
                .then(function (answer) {
                    $scope.status = 'You said the information was "' + answer + '".';
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
        }

        function ComparativoController($scope, $rootScope, $mdDialog) {

            $scope.hide = function () {
                $mdDialog.hide();
            };

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.answer = function (answer) {
                $mdDialog.hide(answer);
            };


            // paises = [ {...} , {...} , {pais:"Argentina", data: [{...}, {...}, {date:"2020-1-22", confirmed:...} ] } ]

            $scope.paisesComparacion = statsdb.filter((d) => d.marcado);

            $scope.maxlenght = 0;
            $scope.dataset1 = [];
            $scope.dataset2 = [];
            $scope.dataset3 = [];

            $scope.borderColors = [ 'rgb(255, 0, 132)',
            'rgb(255, 132, 0)',
            'rgb(0, 255, 132)',
            'rgb(0, 132, 255)',
            'rgb(132, 0, 255)',
            'rgb(132, 255, 0)',
                ]

            for (let i = 0; i < $scope.paisesComparacion.length; i++) {
                const pais = $scope.paisesComparacion[i];
                pais.marcado = false;

                $scope.dataset1.push({
                    label: 'Casos Confirmados ' + pais.pais,
                    // backgroundColor: 'rgba(255, 99, 132, 70)',
                    borderColor: $scope.borderColors[i],
                    data: pais.data.map((d) => d.confirmed)
                });

                $scope.dataset2.push({
                    label: 'Recuperados ' + pais.pais,
                    // backgroundColor: 'rgba(255, 99, 132, 70)',
                    borderColor: $scope.borderColors[i],
                    data: pais.data.map((d) => d.recovered)
                });

                $scope.dataset3.push({
                    label: 'Muertes ' + pais.pais,
                    // backgroundColor: 'rgba(255, 99, 132, 70)',
                    borderColor: $scope.borderColors[i],
                    data: pais.data.map((d) => d.deaths)
                });

                if (pais.data.length > $scope.maxlenght)
                    $scope.maxlenght = pais.data.length;
            }

            $scope.labels = new Array($scope.maxlenght);
            for (let j = 0; j < $scope.labels.length; j++) {
                $scope.labels[j] = j;
            }

            $scope.updateGraficos = function () {
                var canvasGrafico4 = document.getElementById('grafico4').getContext('2d');
                var chart4 = new Chart(canvasGrafico4, {
                    type: 'line',
                    data: {
                        labels: $scope.labels,
                        datasets: $scope.dataset1
                    },
                    options: {}
                });

                var canvasGrafico5 = document.getElementById('grafico5').getContext('2d');
                var chart5 = new Chart(canvasGrafico5, {
                    type: 'line',
                    data: {
                        labels: $scope.labels,
                        datasets: $scope.dataset2
                    },
                    options: {}
                });

                var canvasGrafico6 = document.getElementById('grafico6').getContext('2d');
                var chart6 = new Chart(canvasGrafico6, {
                    type: 'line',
                    data: {
                        labels: $scope.labels,
                        datasets: $scope.dataset3
                    },
                    options: {}
                });

            };

            setTimeout($scope.updateGraficos, 500);

        }

        $scope.callDialog = function (currentPais) {
            $rootScope.currentPais = currentPais;

            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'pais.tmpl.html',
                parent: angular.element(document.body),
                /* targetEvent: ev, */
                clickOutsideToClose: true
            })
                .then(function (answer) {
                    $scope.status = 'You said the information was "' + answer + '".';
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
        }

        // ---------------------------------------- //
        // Dialog Controller
        // ---------------------------------------- //
        function DialogController($scope, $rootScope, $mdDialog) {
            $scope.pais = $rootScope.currentPais;

            $scope.hide = function () {
                $mdDialog.hide();
            };

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.answer = function (answer) {
                $mdDialog.hide(answer);
            };

            $scope.updateGraficos = function () {

                var dataChart = $scope.pais.data.filter((d) => d.confirmed > 0);

                var canvasGrafico1 = document.getElementById('grafico1').getContext('2d');

                var chart1 = new Chart(canvasGrafico1, {
                    // The type of chart we want to create
                    type: 'line',

                    // The data for our dataset
                    data: {
                        labels: dataChart.map((d) => { return $filter('date')(d.dateObj, "dd/MM") }),
                        datasets: [
                            {
                                label: 'Muertes',
                                // backgroundColor: 'rgba(255, 99, 132, 70)',
                                borderColor: 'rgb(255, 99, 132)',
                                data: dataChart.map((d) => d.deaths)
                            },
                            {
                                label: 'Recuperaciones',
                                // backgroundColor: 'rgba(132, 255, 99,70)',
                                borderColor: 'rgb(132, 255, 99)',
                                data: dataChart.map((d) => d.recovered)
                            },
                            {
                                label: 'Casos Confirmados',
                                // backgroundColor: 'rgba(99, 132, 255,70)',
                                borderColor: 'rgb(99, 132, 255)',
                                data: dataChart.map((d) => d.confirmed)
                            },
                        ]
                    },

                    // Configuration options go here
                    options: {}
                });

                var canvasGrafico2 = document.getElementById('grafico2').getContext('2d');

                var chart2 = new Chart(canvasGrafico2, {
                    // The type of chart we want to create
                    type: 'line',

                    // The data for our dataset
                    data: {
                        labels: dataChart.map((d) => { return $filter('date')(d.dateObj, "dd/MM") }),
                        datasets: [
                            {
                                label: 'Delta Muertes',
                                // backgroundColor: 'rgba(255, 99, 132, 70)',
                                borderColor: 'rgb(255, 99, 132)',
                                data: dataChart.map((d) => d.varDeaths)
                            },
                            {
                                label: 'Delta Recuperaciones',
                                // backgroundColor: 'rgba(132, 255, 99,70)',
                                borderColor: 'rgb(132, 255, 99)',
                                data: dataChart.map((d) => d.varRecovered)
                            },
                            {
                                label: 'Delta Casos Confirmados',
                                // backgroundColor: 'rgba(99, 132, 255,70)',
                                borderColor: 'rgb(99, 132, 255)',
                                data: dataChart.map((d) => d.varConfirmed)
                            },
                        ]
                    },

                    // Configuration options go here
                    options: {}
                });

                var canvasGrafico3 = document.getElementById('grafico3').getContext('2d');

                var chart3 = new Chart(canvasGrafico3, {
                    // The type of chart we want to create
                    type: 'line',

                    // The data for our dataset
                    data: {
                        labels: dataChart.map((d) => { return $filter('date')(d.dateObj, "dd/MM") }),
                        datasets: [
                            {
                                label: '% Var. Muertes',
                                // backgroundColor: 'rgba(255, 99, 132, 70)',
                                borderColor: 'rgb(255, 99, 132)',
                                data: dataChart.map((d) => d.percentDeaths)
                            },
                            {
                                label: '% Var. Recuperaciones',
                                // backgroundColor: 'rgba(132, 255, 99,70)',
                                borderColor: 'rgb(132, 255, 99)',
                                data: dataChart.map((d) => d.percentRecovered)
                            },
                            {
                                label: '% Var. Casos Confirmados',
                                // backgroundColor: 'rgba(99, 132, 255,70)',
                                borderColor: 'rgb(99, 132, 255)',
                                data: dataChart.map((d) => d.percentConfirmed)
                            },
                        ]
                    },

                    // Configuration options go here
                    options: {}
                });

            };

            $scope.initReport = function () {

                var paisPreJsonData = Array.prototype.concat([{
                    "date": { type: "date string" },
                    "dateObj": { type: "date" },
                    "dia": { type: "number" },

                    "confirmed": { type: "number" },
                    "varConfirmed": { type: "number" },
                    "percentConfirmed": { type: "number" },

                    "deaths": { type: "number" },
                    "varDeaths": { type: "number" },
                    "percentDeaths": { type: "number" },

                    "recovered": { type: "number" },
                    "varRecovered": { type: "number" },
                    "percentRecovered": { type: "number" },

                }], $scope.pais.data);

                var pivot = new WebDataRocks({
                    container: "reportContainer",
                    toolbar: true,
                    report: {
                        dataSource: {
                            data: paisPreJsonData
                        }
                    }
                });
            }

            setTimeout($scope.initReport, 300);
            setTimeout($scope.updateGraficos, 500);
        }; // FIN Dialog Controller


        $scope.updateStats();
        $interval($scope.updateStats, (1 * 60 * 60 * 1000))
    });
