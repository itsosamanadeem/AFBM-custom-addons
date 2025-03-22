/** @odoo-module **/

import { loadBundle } from "@web/core/assets";
import publicWidget from "@web/legacy/js/public/public_widget";
import { _t } from "@web/core/l10n/translation";
import { jsonrpc } from "@web/core/network/rpc_service";
 import { session } from "@web/session";
import {
  isBrowserChrome,
  isMobileOS,
} from "@web/core/browser/feature_detection";
import { localization } from "@web/core/l10n/localization";
import { renderToElement, renderToFragment } from "@web/core/utils/render";
import { sprintf } from "@web/core/utils/strings";
import { insertThousandsSep } from "@web/core/utils/numbers";
import {
  formatDate,
  formatDateTime,
  parseDate,
  parseDateTime,
  serializeDate,
  serializeDateTime,
} from "@web/core/l10n/dates";
const { DateTime } = luxon;



    const snippet_dashboard_home_page = publicWidget.Widget.extend({
         selector: '.ks_wdn_website',
        disabledInEditableMode: false,
        events: {
            'click ul#ks_date_selector_container li': '_ksOnDateFilterMenuSelect',
            'click .apply-dashboard-date-filter': '_onKsApplyDateFilter',
            'click .clear-dashboard-date-filter': '_onKsClearDateValues',
//            'click #ks_chart_canvas_id': 'onChartCanvasClick',
            'click .ks_list_canvas_click': 'onChartCanvasClick_funnel',
            'click .ks_load_previous': 'ksLoadPreviousRecords',
            'click .ks_load_next': 'ksLoadMoreRecords',
            'click .ks_dashboard_item_drill_up': 'ksOnDrillUp',
            'click #ks_item_info': function(e) {
                e.stopPropagation();
            },
        },

        _ksOnDateFilterMenuSelect: function(e) {
            if (e.target.id !== 'ks_date_selector_container') {
                var ks_self = this;

                $('.ks_date_filter_selected').each(function(index,$filter_options) {
                    $($filter_options).removeClass("ks_date_filter_selected")
                });

                $(e.target.parentElement).addClass("ks_date_filter_selected");
                $('#ks_date_filter_selection', this.$el).text(ks_self.ks_date_filter_selections[e.target.parentElement.id]);

                if (e.target.parentElement.id !== "l_custom") {
                    ks_self.$el.find('.ks_date_input_fields').addClass("ks_hide");
                    ks_self.$el.find('.ks_date_filter_dropdown').removeClass("ks_btn_first_child_radius");
                    e.target.parentElement.id === "l_none" ? ks_self._onKsClearDateValues() : ks_self._onKsApplyDateFilter();
                } else if (e.target.parentElement.id === "l_custom") {
                    $(".ks_wdn_start_date_picker", ks_self.$el).val(null).removeClass("ks_hide");
                    $(".ks_wdn_end_date_picker", ks_self.$el).val(null).removeClass("ks_hide");
                    $('.ks_date_input_fields', ks_self.$el).removeClass("ks_hide");
                    $('.ks_date_filter_dropdown', ks_self.$el).addClass("ks_btn_first_child_radius");
                    ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                    ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).removeClass("ks_hide");
                }
            }
        },

        getContext: function() {
            var ks_self = this;
            var context = {
                ksDateFilterSelection: ks_self.ksDateFilterSelection,
                ksDateFilterStartDate: ks_self.ksDateFilterStartDate,
                ksDateFilterEndDate: ks_self.ksDateFilterEndDate,
            }
            return Object.assign(context, ks_self._getContext())
        },

        _onKsApplyDateFilter: function() {
            var ks_self = this;

            var $target = ks_self.$target;
            var dashboard_id = $target.attr('data-id');
            var start_date = ks_self.$el.find("#datetimepicker1").val();
            var end_date = ks_self.$el.find("#datetimepicker2").val();
            if (start_date === "Invalid date" ) {
                alert("Invalid Date is given in Start Date.")
            } else if (end_date === "Invalid date") {
                alert("Invalid Date is given in End Date.")
            } else if (ks_self.$el.find('.ks_date_filter_selected').attr('id') !== "l_custom") {

                ks_self.ksDateFilterSelection = ks_self.$el.find('.ks_date_filter_selected').attr('id');

                $.when(ks_self.ks_fetch_items_data()).then(function() {
                    ks_self.ksUpdateDashboardItem(Object.keys(ks_self.config.ks_item_data));
                    ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).addClass("ks_hide");
                    ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).addClass("ks_hide");
                });
            } else {
                if (start_date && end_date) {

                    if (parseDateTime(start_date, self.datetime_format) <= parseDateTime(end_date, self.datetime_format)) {
                        var start_date = formatDateTime(parseDateTime(start_date, self.datetime_format), { format: "yyyy-MM-dd HH:mm:ss"})
                        var end_date = formatDateTime(parseDateTime(end_date, self.datetime_format), { format: "yyyy-MM-dd HH:mm:ss" })
                        if (start_date === "Invalid date" || end_date === "Invalid date"){
                            alert(_t("Invalid Date"));
                        }else{
                            ks_self.ksDateFilterSelection = ks_self.$el.find('.ks_date_filter_selected').attr('id');
                            ks_self.ksDateFilterStartDate = start_date;
                            ks_self.ksDateFilterEndDate = end_date;

                            $.when(ks_self.ks_fetch_items_data()).then(function() {
                                ks_self.ksUpdateDashboardItem(Object.keys(ks_self.config.ks_item_data));
                                ks_self.$el.find(".apply-dashboard-date-filter", ks_self.$el).addClass("ks_hide");
                                ks_self.$el.find(".clear-dashboard-date-filter", ks_self.$el).addClass("ks_hide");

                            });
                       }

                    } else {
                        alert(_t("Start date should be less than end date"));
                    }
                } else {
                    alert(_t("Please enter start date and end date"));
                }
            }
        },

        ksUpdateDashboardItem: function(ids) {
            var ks_self = this;

            for (var i = 0; i < ids.length; i++) {
                var item_data = ks_self.config.ks_item_data[ids[i]]

                if (item_data['ks_dashboard_item_type'] === "ks_list_view") {
                    var item_view = ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                    item_view.find('.card-body').empty();
                    item_view.find('.ks_dashboard_item_drill_up').addClass('d-none')
                    item_view.find('.card-body').append(ks_self._renderListViewData(item_data));
                    var rows = JSON.parse(item_data['ks_list_view_data']).data_rows;
                    var ks_length = rows ? rows.length : false;
                    if (ks_length) {
                        if (item_view.find('.ks_pager_name')) {
                            item_view.find('.ks_pager_name').empty();
                            var $ks_pager_container = renderToElement('ks_website_dashboard_ninja.Ks_pager_template', {
                                item_id: ids[i],
                                intial_count: item_data.ks_pagination_limit,
                                offset : 1
                            })
                            item_view.find('.ks_pager_name').append($($ks_pager_container));
                        }
                            if (ks_length < item_data.ks_pagination_limit) item_view.find('.ks_load_next').addClass('ks_event_offer_list');
                                item_view.find('.ks_value').text("1-" + JSON.parse(item_data['ks_list_view_data']).data_rows.length);

                            if (item_data.ks_record_data_limit == item_data.ks_pagination_limit || item_data.ks_record_count==item_data.ks_pagination_limit) {
                                item_view.find('.ks_load_next').addClass('ks_event_offer_list');
                            }
                    } else {
                        item_view.find('.ks_pager').addClass('d-none');
                    }
                } else if (item_data['ks_dashboard_item_type'] === "ks_tile") {
                    var item_view = ks_self._ksRenderDashboardTile(item_data);
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").empty();
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").append($(item_view).find('.ks_dashboarditem_id'));
                } else if (item_data['ks_dashboard_item_type'] === "ks_kpi") {
                    var item_view = ks_self.renderKpi(item_data);
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").empty();
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").append($(item_view).find('.ks_dashboarditem_id'));
                } else  if (item_data['ks_dashboard_item_type'] == 'ks_to_do'){
//                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").empty();
//                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").append(ks_self.ksRenderToDoDashboardView(item_data));
                }else if (item_data['ks_dashboard_item_type'] == 'ks_funnel_chart'){
                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                    ks_self.ksrenderfunnelchart(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                }else if (item_data['ks_dashboard_item_type'] == 'ks_map_view'){
                 ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                    ks_self.ksrendermapview(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                }else{
                 ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                 ks_self.ks_render_graphs(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                }
            }
            ks_self.grid.setStatic(true);
        },

        ks_fetch_data: function() {
            var ks_self = this;
            ks_self.dashboard_id = ks_self.$target.attr('data-id');
            return jsonrpc('/dashboard/data', {
                model: 'ks_dashboard_ninja.items',
                method: 'ks_dashboard_data_handler',
                args: [],
                kwargs: {
                    'id': Number(ks_self.dashboard_id),
                    'type': ks_self.data_selection,
                    context: ks_self.getContext(),
                },

            }).then(function(data) {
                if (data !== "missingerror") {
                    if(! data.login){
                        ks_self.$el = ks_self.$target.empty();
                        if(data.type === 'user_data') {
                            $(renderToElement('ks_website_dashboard_ninja.KsWebsiteNoItemNoUserView')).appendTo(ks_self.$el);
                            $('.ks_dashboard_header').addClass('ks_hide');
                            return false;
                        }
                        else if(data.type === 'all_data') {
                            ks_self.config = data;
                            return true;
                        }
                    }
                    else {
                        ks_self.config = data;
                        return true;
                    }
                }
            }.bind(ks_self));
        },

        _onKsClearDateValues: function() {
            var ks_self = this;
            var $target = ks_self.$target;
            var dashboard_id = $target.attr('data-id')
            var type = $target.attr('data-selection')

            ks_self.ksDateFilterSelection = 'l_none';
            ks_self.ksDateFilterStartDate = false;
            ks_self.ksDateFilterEndDate = false;

            $.when(ks_self.ks_fetch_items_data()).then(function() {
                ks_self.ksRenderDashboard($target,dashboard_id);
                $('.ks_date_input_fields').addClass("ks_hide");
                $('.ks_date_filter_dropdown').removeClass("ks_btn_first_child_radius");
            });
        },

        init: function(parent,options) {
            this._super.apply(this, arguments);
            this.form_template = 'ks_dashboard_ninja_template_view';
this.gridstackConfig = {};
    this.ks_date_filter_selections = {
      l_none: "Date Filter",
      l_day: "Today",
      t_week: "This Week",
      t_month: "This Month",
      t_quarter: "This Quarter",
      t_year: "This Year",
      n_day: "Next Day",
      n_week: "Next Week",
      n_month: "Next Month",
      n_quarter: "Next Quarter",
      n_year: "Next Year",
      ls_day: "Last Day",
      ls_week: "Last Week",
      ls_month: "Last Month",
      ls_quarter: "Last Quarter",
      ls_year: "Last Year",
      l_week: "Last 7 days",
      l_month: "Last 30 days",
      l_quarter: "Last 90 days",
      l_year: "Last 365 days",
      ls_past_until_now: "Past till Now",
      ls_pastwithout_now: "Past Excluding Today",
      n_future_starting_now: "Future Starting Now",
      n_futurestarting_tomorrow: "Future Starting Tomorrow",
      l_custom: "Custom Filter",
    };
    this.ks_date_filter_selection_order = [
      "l_day",
      "t_week",
      "t_month",
      "t_quarter",
      "t_year",
      "n_day",
      "n_week",
      "n_month",
      "n_quarter",
      "n_year",
      "ls_day",
      "ls_week",
      "ls_month",
      "ls_quarter",
      "ls_year",
      "l_week",
      "l_month",
      "l_quarter",
      "l_year",
      "ls_past_until_now",
      "ls_pastwithout_now",
      "n_future_starting_now",
      "n_futurestarting_tomorrow",
      "l_custom",
    ];
    this.date_format = localization.dateFormat;
    this.datetime_format = localization.dateTimeFormat;
    this.file_type_magic_word = {
      "/": "jpg",
      R: "gif",
      i: "png",
      P: "svg+xml",
    };
    this.grid = false;
    this.ksChartColorOptions = ["default", "dark", "moonrise", "material"];
    this.chart_container = {};
    this.gridstack_options = {
      staticGrid: true,
      float: false,
      cellHeight: 80,
      styleInHead: true,
      //                disableOneColumnMode: true,
    };
    if (isMobileOS()) {
      this.gridstack_options.disableOneColumnMode = false;
    }
    this.ksDateFilterSelection = false;
    this.ksDateFilterStartDate = false;
    this.ksDateFilterEndDate = false;
    this.ksUpdateDashboard = {};
        },


         start: function() {
            var ks_self = this;
            ks_self.data_selection = ks_self.$target.attr('data-selection');
            var dashboard_id = ks_self.$target.attr('data-id');
            $.when(ks_self.ks_fetch_data()).then(function(result) {
                if(result){
                    $.when(ks_self.ks_fetch_items_data()).then(function(result) {
                        var $target = ks_self.$target;
//                        ks_self.ks_set_update_interval();
                        ks_self.ksRenderDashboard($target, dashboard_id);
                    });
                }
            });
        },

          ks_fetch_items_data: function () {
    var self = this;
    var items_promises = [];
    self.config.ks_dashboard_items_ids.forEach(function (value) {
      items_promises.push(
        jsonrpc("/fetch/item/update", {
          model: "ks_dashboard_ninja.items",
          method: "ks_dashboard_data_handler",
          args: [],
          kwargs: {
            item_id: Number(value),
            dashboard: Number(self.dashboard_id),
            type: self.data_selection,
            params: self.ksGetParamsForItemFetch(value),
            context: self.getContext(),
          },

        }).then(function (result) {
          self.config.ks_item_data[value] = result[value];
        })
      );
    });

    return Promise.all(items_promises);
  },
  ksGetParamsForItemFetch: function () {
    return {};
  },

     ksRenderDashboard: function ($target, dashboard_id) {
    var ks_self = this;
    ks_self.$el = $target.empty();
    //    ks_self.$target.parent().addClass("ks_wdn_website");

    var type = $target.attr("data-selection");
    ks_self.$el.addClass(
      "ks_dashboard_ninja d-flex flex-column ks_dashboard_identifier_" +
        dashboard_id +
        "_" +
        type
    );

    var $ks_header = $(
      renderToElement("ks_website_dashboard_ninja.KsDashboardNinjaHeader", {
        ks_dashboard_name: ks_self.config.name,
        ks_dashboard_manager: ks_self.config.ks_dashboard_manager,
        date_selection_data: ks_self.ks_date_filter_selections,
        date_selection_order: ks_self.ks_date_filter_selection_order,
        ks_dashboard_data: ks_self.config,
        ks_user_name: ks_self.config.ks_user_name,
        ks_dn_pre_defined_filters: Object.values(
          ks_self.config.ks_dashboard_pre_domain_filter
        ).sort(function (a, b) {
          return a.sequence - b.sequence;
        }),
        play_button: true,
      })
    );
    $ks_header.find(".ks_dn_filter_selection_input").addClass("d-none");
    ks_self.$el.append($ks_header);
    ks_self.ksRenderDashboardMainContent();
  },

  ksSortItems: function (ks_item_data) {
    var items = [];
    var ks_self = this;
    var item_data = Object.assign({}, ks_item_data);

    if (ks_self.config.ks_gridstack_config) {
      ks_self.gridstackConfig = JSON.parse(ks_self.config.ks_gridstack_config);
      var a = Object.values(ks_self.gridstackConfig);
      var b = Object.keys(ks_self.gridstackConfig);
      for (var i = 0; i < a.length; i++) {
        a[i]["id"] = b[i];
      }
      a.sort(function (a, b) {
        return 35 * a.y + a.x - (35 * b.y + b.x);
      });
      for (var i = 0; i < a.length; i++) {
        if (item_data[a[i]["id"]]) {
          items.push(item_data[a[i]["id"]]);
          delete item_data[a[i]["id"]];
        }
      }
    }

    return items.concat(Object.values(item_data));
  },

  ksRenderDashboardMainContent: function () {
    var ks_self = this;

    if (Object.keys(ks_self.config.ks_item_data).length) {
      ks_self._renderDateFilterDatePicker();
      $(".ks_dashboard_items_list", this.$el).remove();
      var $dashboard_body_container = $(
        renderToElement("ks_main_body_container")
      );
      var $gridstackContainer = $dashboard_body_container.find(".grid-stack");
      $dashboard_body_container.appendTo(ks_self.$el);
      ks_self.grid = GridStack.init({}, $gridstackContainer[0]);
      var items = ks_self.ksSortItems(ks_self.config.ks_item_data);

      ks_self.ksRenderDashboardItems(items);

      // In gridstack version 0.3 we have to make static after adding element in dom
      ks_self.grid.setStatic(true);
    } else {
      ks_self.$el.find(".ks_dashboard_link").addClass("ks_hide");
      $(renderToElement("ks_website_dashboard_ninja.KsWebsiteNoItemView")).appendTo(ks_self.$el);
    }
  },

     _ksRenderNoItemView: function () {
    var ks_self = this;
    $(".ks_dashboard_items_list", ks_self.$el).remove();
    jsonrpc("/check/user", {
      model: "ks_dashboard_ninja.board",
      method: "ks_check_user_login",
      args: [],
      kwargs: {},
    }).then(
      function (result) {
        if (result) {
          $(renderToElement("ks_website_dashboard_ninja.KsWebsiteNoItemView")).appendTo(ks_self.$el);
        } else {
          ks_self.$el.empty();
          $(renderToElement("ks_website_dashboard_ninja.KsWebsiteNoItemNoUserView")).appendTo(ks_self.$el);
        }
      }.bind(this)
    );
  },

          ksRenderDashboardItems: function (items) {
    var ks_self = this;
    ks_self.$el.find(".print-dashboard-btn").addClass("ks_pro_print_hide");

    if (ks_self.config.ks_gridstack_config) {
      ks_self.gridstackConfig = JSON.parse(ks_self.config.ks_gridstack_config);
    }
    var item_view;
    for (var i = 0; i < items.length; i++) {
      if (ks_self.grid) {
        if (items[i].ks_dashboard_item_type === "ks_tile") {
          var item_view = ks_self._ksRenderDashboardTile(items[i]);
          if (items[i].id in ks_self.gridstackConfig) {
            ks_self.grid.addWidget($(item_view)[0], {
              x: ks_self.gridstackConfig[items[i].id].x,
              y: ks_self.gridstackConfig[items[i].id].y,
              w: ks_self.gridstackConfig[items[i].id].w,
              h: ks_self.gridstackConfig[items[i].id].h,
              autoPosition: false,
              minW: 2,
              maxW: null,
              minH: 2,
              maxH: 2,
              id: items[i].id,
            });
          } else {
            ks_self.grid.addWidget($(item_view)[0], {
              x: 0,
              y: 0,
              w: 3,
              h: 2,
              autoPosition: true,
              minW: 2,
              maxW: null,
              minH: 2,
              maxH: 2,
              id: items[i].id,
            });
          }
        } else if (items[i].ks_dashboard_item_type === "ks_list_view") {
          ks_self._renderListView(items[i], ks_self.grid);
        } else if (items[i].ks_dashboard_item_type === "ks_kpi") {
          var $kpi_preview = ks_self.renderKpi(items[i]);
          var item_id = items[i].id;
          if (items[i].id in ks_self.gridstackConfig) {
            ks_self.grid.addWidget($kpi_preview[0], {
              x: ks_self.gridstackConfig[items[i].id].x,
              y: ks_self.gridstackConfig[items[i].id].y,
              w: ks_self.gridstackConfig[items[i].id].w,
              h: ks_self.gridstackConfig[items[i].id].h,
              autoPosition: false,
              minW: 2,
              maxW: null,
              minH: 2,
              maxH: 2,
              id: items[i].id,
            });
          } else {
            ks_self.grid.addWidget($kpi_preview[0], {
              x: 0,
              y: 0,
              w: 3,
              h: 2,
              autoPosition: true,
              minW: 2,
              maxW: null,
              minH: 2,
              maxH: 2,
              id: items[i].id,
            });
          }
        } else if (items[i].ks_dashboard_item_type === "ks_to_do") {
          var $to_do_preview = ks_self.ksRenderToDoDashboardView(items[i])[0];
          if (items[i].id in ks_self.gridstackConfig) {
            ks_self.grid.addWidget($to_do_preview[0], {
              x: ks_self.gridstackConfig[items[i].id].x,
              y: ks_self.gridstackConfig[items[i].id].y,
              w: ks_self.gridstackConfig[items[i].id].w,
              h: ks_self.gridstackConfig[items[i].id].h,
              autoPosition: false,
              minW: 3,
              maxW: null,
              minH: 2,
              maxH: null,
              id: items[i].id,
            });
          } else {
            ks_self.grid.addWidget($to_do_preview[0], {
              x: 0,
              y: 0,
              w: 5,
              h: 4,
              autoPosition: true,
              minW: 3,
              maxW: null,
              minH: 2,
              maxH: null,
              id: items[i].id,
            });
          }
        } else {
          ks_self._renderGraph(items[i], ks_self.grid);
        }
      }
    }
  },

        _ks_get_rgba_format: function(val) {
            var rgba = val.split(',')[0].match(/[A-Za-z0-9]{2}/g);
            rgba = rgba.map(function(v) {
                return parseInt(v, 16)
            }).join(",");
            return "rgba(" + rgba + "," + val.split(',')[1] + ")";
        },

  ksNumFormatter: function (num, digits) {
    var negative;
    var si = [
      {
        value: 1,
        symbol: "",
      },
      {
        value: 1e3,
        symbol: "k",
      },
      {
        value: 1e6,
        symbol: "M",
      },
      {
        value: 1e9,
        symbol: "G",
      },
      {
        value: 1e12,
        symbol: "T",
      },
      {
        value: 1e15,
        symbol: "P",
      },
      {
        value: 1e18,
        symbol: "E",
      },
    ];
    if (num < 0) {
      num = Math.abs(num);
      negative = true;
    }
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
      if (num >= si[i].value) {
        break;
      }
    }
    if (negative) {
      return (
        "-" +
        (num / si[i].value).toFixed(digits).replace(rx, "$1") +
        si[i].symbol
      );
    } else {
      return (
        (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol
      );
    }
  },

  ksNumIndianFormatter: function (num, digits) {
    var negative;
    var si = [
      {
        value: 1,
        symbol: "",
      },
      {
        value: 1e3,
        symbol: "Th",
      },
      {
        value: 1e5,
        symbol: "Lakh",
      },
      {
        value: 1e7,
        symbol: "Cr",
      },
      {
        value: 1e9,
        symbol: "Arab",
      },
    ];
    if (num < 0) {
      num = Math.abs(num);
      negative = true;
    }
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
      if (num >= si[i].value) {
        break;
      }
    }
    if (negative) {
      return (
        "-" +
        (num / si[i].value).toFixed(digits).replace(rx, "$1") +
        si[i].symbol
      );
    } else {
      return (
        (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol
      );
    }
  },
  _onKsGlobalFormatter: function (
    ks_record_count,
    ks_data_format,
    ks_precision_digits
  ) {
    var self = this;
    if (ks_data_format == "exact") {
      return self.ksFormatValue(ks_record_count, "float", ks_precision_digits);
    } else {
      if (ks_data_format == "indian") {
        return self.ksNumIndianFormatter(ks_record_count, 1);
      } else if (ks_data_format == "colombian") {
        return self.ksNumColombianFormatter(
          ks_record_count,
          1,
          ks_precision_digits
        );
      } else {
        return self.ksNumFormatter(ks_record_count, 1);
      }
    }
  },

  ksNumColombianFormatter: function (num, digits, ks_precision_digits) {
    var negative;
    var si = [
      {
        value: 1,
        symbol: "",
      },
      {
        value: 1e3,
        symbol: "",
      },
      {
        value: 1e6,
        symbol: "M",
      },
      {
        value: 1e9,
        symbol: "M",
      },
      {
        value: 1e12,
        symbol: "M",
      },
      {
        value: 1e15,
        symbol: "M",
      },
      {
        value: 1e18,
        symbol: "M",
      },
    ];
    if (num < 0) {
      num = Math.abs(num);
      negative = true;
    }
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
      if (num >= si[i].value) {
        break;
      }
    }
    if (si[i].symbol === "M") {
      //                si[i].value = 1000000;
      num = parseInt(num) / 1000000;
      num = this.ksFormatValue(num, "init", ks_precision_digits);
      if (negative) {
        return "-" + num + si[i].symbol;
      } else {
        return num + si[i].symbol;
      }
    } else {
      if (num % 1 === 0) {
        num = this.ksFormatValue(num, "init", ks_precision_digits);
      } else {
        num = this.ksFormatValue(num, "float", ks_precision_digits);
      }
      if (negative) {
        return "-" + num;
      } else {
        return num;
      }
    }
  },

  ksFormatValue: function (value, field_type, ks_precision_digits) {
    if (value === false) {
      return "";
    }
    var l10n = localization;
    var ks_decimal_precision = ks_precision_digits;
    var ks_formatted = sprintf(_t("%s.00"), value || 0).split(".");
    ks_formatted[0] = insertThousandsSep(ks_formatted[0]);
    if (field_type == "init") {
      return ks_formatted[0];
    } else {
      return ks_formatted.join(l10n.decimalpoint);
    }
  },

        ks_monetary: function(value, ks_currency, position) {
//            var currency = session.get_currency(currency_id);
            if (!ks_currency) {
                return value;
            }
            if (position === "after") {
                return value += ' ' + ks_currency;
            } else {
                return ks_currency + ' ' + value;
            }
        },


          _renderDateFilterDatePicker: function () {
    var ks_self = this;

    //Show Print option cause items are present.
    ks_self.$el.find(".ks_dashboard_link").removeClass("ks_hide");
    ks_self.$el.find("#datetimepicker1")[0].value = formatDate(DateTime.now(), { format: "yyyy-MM-dd" });
    ks_self.$el.find("#datetimepicker2")[0].value = formatDate(DateTime.now(), { format: "yyyy-MM-dd" });


    ks_self._KsGetDateValues();
  },

        ks_set_update_interval: function() {
            var self = this;

            if (self.config.ks_item_data) {
                Object.keys(self.config.ks_item_data).forEach(function(item_id) {
                    var item_data = self.config.ks_item_data[item_id]
                    var updateValue = item_data["ks_update_items_data"];
                    if (updateValue) {
                        if (!(item_id in self.ksUpdateDashboard)) {
                            if (['ks_tile', 'ks_list_view', 'ks_kpi'].indexOf(item_data['ks_dashboard_item_type']) >= 0) {
                                var ksItemUpdateInterval = setInterval(function() {
                                    self.ksFetchUpdateItem(item_id)
                                }, updateValue);
                            } else {
                                var ksItemUpdateInterval = setInterval(function() {
                                    self.ksFetchUpdateItem(item_id)
                                }, updateValue);
                            }
                            self.ksUpdateDashboard[item_id] = ksItemUpdateInterval;
                        }
                    }
                });
            }
        },

        ks_remove_update_interval: function() {
            var self = this;
            if (self.ksUpdateDashboard) {
                Object.values(self.ksUpdateDashboard).forEach(function(itemInterval) {
                    clearInterval(itemInterval);
                });
            }
        },

        _KsGetDateValues: function() {
            var self = this;

            //Setting Date Filter Selected Option in Date Filter DropDown Menu
            var date_filter_selected = self.config.ks_date_filter_selection;
            if (self.ksDateFilterSelection == 'l_none'){
                    var date_filter_selected = self.ksDateFilterSelection;
            }
            self.$el.find('#' + date_filter_selected).addClass("ks_date_filter_selected");
            self.$el.find('#ks_date_filter_selection').text(self.ks_date_filter_selections[date_filter_selected]);

            if (self.config.ks_date_filter_selection === "l_custom") {
      var ks_end_date = self.config.ks_dashboard_end_date;
      var ks_start_date = self.config.ks_dashboard_start_date;
      self.$el.find(".ks_date_input_fields").removeClass("ks_hide");
      self.$el
        .find(".ks_date_filter_dropdown")
        .addClass("ks_btn_first_child_radius");
    } else if (self.config.ks_date_filter_selection !== "l_custom") {
      self.$el.find(".ks_date_input_fields").addClass("ks_hide");
    }
        },

  ks_get_dark_color: function (color, opacity, percent) {
    var num = parseInt(color.slice(1), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = ((num >> 8) & 0x00ff) + amt,
      B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1) +
      "," +
      opacity
    );
  },
  _ksRenderDashboardTile: function (tile) {
    var ks_self = this;
    var ks_container_class = "grid-stack-item",
      ks_inner_container_class = "grid-stack-item-content";
    var ks_icon_url, item_view;
    var ks_rgba_background_color,
      ks_rgba_font_color,
      ks_rgba_default_icon_color;
    var style_main_body,
      style_image_body_l2,
      style_domain_count_body,
      style_button_customize_body,
      style_button_delete_body;

    var data_count = ks_self.ksNumFormatter(tile.ks_record_count, 1);
    if (tile.ks_icon_select == "Custom") {
      if (tile.ks_icon[0]) {
        ks_icon_url =
          "data:image/" +
          (ks_self.file_type_magic_word[tile.ks_icon[0]] || "png") +
          ";base64," +
          tile.ks_icon;
      } else {
        ks_icon_url = false;
      }
    } else {
      ks_icon_url = false;
    }
    if (tile.ks_multiplier_active) {
      var ks_record_count = tile.ks_record_count * tile.ks_multiplier;
      var data_count = ks_self._onKsGlobalFormatter(
        ks_record_count,
        tile.ks_data_formatting,
        tile.ks_precision_digits
      );
      var count = ks_record_count;
    } else {
      var data_count = ks_self._onKsGlobalFormatter(
        tile.ks_record_count,
        tile.ks_data_formatting,
        tile.ks_precision_digits
      );
      var count = tile.ks_record_count;
    }

    tile.ksIsDashboardManager = ks_self.config.ks_dashboard_manager;
    ks_rgba_background_color = ks_self._ks_get_rgba_format(
      tile.ks_background_color
    );
    ks_rgba_font_color = ks_self._ks_get_rgba_format(tile.ks_font_color);
    ks_rgba_default_icon_color = ks_self._ks_get_rgba_format(
      tile.ks_default_icon_color
    );
    style_main_body =
      "background-color:" +
      ks_rgba_background_color +
      ";color : " +
      ks_rgba_font_color +
      ";";
    switch (tile.ks_layout) {
      case "layout1":
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout1",
          {
            item: tile,
            style_main_body: style_main_body,
            ks_icon_url: ks_icon_url,
            ks_rgba_default_icon_color: ks_rgba_default_icon_color,
            ks_container_class: ks_container_class,
            ks_inner_container_class: ks_inner_container_class,
            ks_dashboard_list: ks_self.config.ks_dashboard_list,
            data_count: data_count,
            count: data_count,
          }
        );
        break;

      case "layout2":
        var ks_rgba_dark_background_color_l2 = ks_self._ks_get_rgba_format(
          ks_self.ks_get_dark_color(
            tile.ks_background_color.split(",")[0],
            tile.ks_background_color.split(",")[1],
            -10
          )
        );
        style_image_body_l2 =
          "background-color:" + ks_rgba_dark_background_color_l2 + ";";
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout2",
          {
            item: tile,
            style_image_body_l2: style_image_body_l2,
            style_main_body: style_main_body,
            ks_icon_url: ks_icon_url,
            ks_rgba_default_icon_color: ks_rgba_default_icon_color,
            ks_container_class: ks_container_class,
            ks_inner_container_class: ks_inner_container_class,
            ks_dashboard_list: ks_self.config.ks_dashboard_list,
            data_count: data_count,
            count: count,
          }
        );
        break;

      case "layout3":
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout3",
          {
            item: tile,
            style_main_body: style_main_body,
            ks_icon_url: ks_icon_url,
            ks_rgba_default_icon_color: ks_rgba_default_icon_color,
            ks_container_class: ks_container_class,
            ks_inner_container_class: ks_inner_container_class,
            ks_dashboard_list: ks_self.config.ks_dashboard_list,
            data_count: data_count,
            count: count,
          }
        );
        break;

      case "layout4":
        style_main_body =
          "color : " +
          ks_rgba_font_color +
          ";border : solid;border-width : 1px;border-color:" +
          ks_rgba_background_color +
          ";";
        style_image_body_l2 =
          "background-color:" + ks_rgba_background_color + ";";
        style_domain_count_body = "color:" + ks_rgba_background_color + ";";
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout4",
          {
            item: tile,
            style_main_body: style_main_body,
            style_image_body_l2: style_image_body_l2,
            style_domain_count_body: style_domain_count_body,
            ks_icon_url: ks_icon_url,
            ks_rgba_default_icon_color: ks_rgba_default_icon_color,
            ks_container_class: ks_container_class,
            ks_inner_container_class: ks_inner_container_class,
            ks_dashboard_list: ks_self.config.ks_dashboard_list,
            data_count: data_count,
            count: count,
          }
        );
        break;

      case "layout5":
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout5",
          {
            item: tile,
            style_main_body: style_main_body,
            ks_icon_url: ks_icon_url,
            ks_rgba_default_icon_color: ks_rgba_default_icon_color,
            ks_container_class: ks_container_class,
            ks_inner_container_class: ks_inner_container_class,
            ks_dashboard_list: ks_self.config.ks_dashboard_list,
            data_count: data_count,
            count: count,
          }
        );
        break;

      case "layout6":
        ks_rgba_default_icon_color = ks_self._ks_get_rgba_format(
          tile.ks_default_icon_color
        );
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout6",
          {
            item: tile,
            style_image_body_l2: style_image_body_l2,
            style_main_body: style_main_body,
            ks_icon_url: ks_icon_url,
            ks_rgba_default_icon_color: ks_rgba_default_icon_color,
            ks_container_class: ks_container_class,
            ks_inner_container_class: ks_inner_container_class,
            ks_dashboard_list: ks_self.config.ks_dashboard_list,
            data_count: data_count,
            count: count,
          }
        );
        break;

      default:
        item_view = renderToElement(
          "ks_website_dashboard_ninja.Ks_dashboard_item_layout_default",
          {
            item: tile,
          }
        );
        break;
    }

    return item_view;
  },


  ksSum: function (
    count_1,
    count_2,
    item_info,
    field,
    target_1,
    $kpi_preview,
    kpi_data
  ) {
    var self = this;
    var count = count_1 + count_2;
    if (field.ks_multiplier_active) {
      item_info["count"] = self._onKsGlobalFormatter(
        count * field.ks_multiplier,
        field.ks_data_formatting,
        field.ks_precision_digits
      );
      item_info["count_tooltip"] = count * field.ks_multiplier;
    } else {
      item_info["count"] = self._onKsGlobalFormatter(
        count,
        field.ks_data_formatting,
        field.ks_precision_digits
      );
      item_info["count_tooltip"] = count;
    }
    if (field.ks_multiplier_active) {
      count = count * field.ks_multiplier;
    }
    item_info["target_enable"] = field.ks_goal_enable;
    var ks_color = target_1 - count > 0 ? "red" : "green";
    item_info.pre_arrow = target_1 - count > 0 ? "down" : "up";
    item_info["ks_comparison"] = true;
    var target_deviation =
      target_1 - count > 0
        ? Math.round(((target_1 - count) / target_1) * 100)
        : Math.round((Math.abs(target_1 - count) / target_1) * 100);
    if (target_deviation !== Infinity)
      item_info.target_deviation =
        self.ksFormatValue(
          target_deviation,
          "init",
          field.ks_precision_digits
        ) + "%";
    else {
      item_info.target_deviation = target_deviation;
      item_info.pre_arrow = false;
    }
    var target_progress_deviation =
      target_1 == 0 ? 0 : Math.round((count / target_1) * 100);
    item_info.target_progress_deviation =
      self.ksFormatValue(
        target_progress_deviation,
        "init",
        field.ks_precision_digits
      ) + "%";
    $kpi_preview = $(
      renderToElement("ks_website_dashboard_ninja.Ks_kpi_template_2", item_info)
    );
    $kpi_preview.find(".target_deviation").css({
      color: ks_color,
    });
    if (field.ks_target_view === "Progress Bar") {
      $kpi_preview.find("#ks_progressbar").val(target_progress_deviation);
    }

    return $kpi_preview;
  },

  ksPercentage: function (
    count_1,
    count_2,
    field,
    item_info,
    target_1,
    $kpi_preview,
    kpi_data
  ) {
    if (field.ks_multiplier_active) {
      count_1 = count_1 * field.ks_multiplier;
      count_2 = count_2 * field.ks_multiplier;
    }
    var count = parseInt((count_1 / count_2) * 100);
    item_info["count"] = count ? count + "%" : "0%";
    item_info["count_tooltip"] = count ? count + "%" : "0%";
    item_info.target_progress_deviation = item_info["count"];
    target_1 = target_1 > 100 ? 100 : target_1;
    item_info.target = target_1 + "%";
    item_info.pre_arrow = target_1 - count > 0 ? "down" : "up";
    var ks_color = target_1 - count > 0 ? "red" : "green";
    item_info["target_enable"] = field.ks_goal_enable;
    item_info["ks_comparison"] = false;
    item_info.target_deviation =
      item_info.target > 100 ? 100 : item_info.target;
    $kpi_preview = $(
      renderToElement("ks_website_dashboard_ninja.Ks_kpi_template_2", item_info)
    );
    $kpi_preview.find(".target_deviation").css({
      color: ks_color,
    });
    if (field.ks_target_view === "Progress Bar") {
      if (count) $kpi_preview.find("#ks_progressbar").val(count);
      else $kpi_preview.find("#ks_progressbar").val(0);
    }

    return $kpi_preview;
  },

  renderKpi: function (item) {
    var ks_self = this;
    var field = item;
    var ks_date_filter_selection = field.ks_date_filter_selection;
    if (field.ks_date_filter_selection === "l_none")
      ks_date_filter_selection = ks_self.config.ks_date_filter_selection;
    var ks_valid_date_selection = [
      "l_day",
      "t_week",
      "t_month",
      "t_quarter",
      "t_year",
    ];
    var kpi_data = JSON.parse(field.ks_kpi_data);
    var count_1 = kpi_data[0].record_data;
    var count_2 = kpi_data[1] ? kpi_data[1].record_data : undefined;
    var target_1 = kpi_data[0].target;
    var target_view = field.ks_target_view,
      pre_view = field.ks_prev_view;
    var ks_rgba_background_color = ks_self._ks_get_rgba_format(
      field.ks_background_color
    );
    var ks_rgba_font_color = ks_self._ks_get_rgba_format(field.ks_font_color);

    if (field.ks_goal_enable) {
      var diffrence = 0.0;
      if (field.ks_multiplier_active) {
        diffrence = count_1 * field.ks_multiplier - target_1;
      } else {
        diffrence = count_1 - target_1;
      }
      var acheive = diffrence >= 0 ? true : false;
      diffrence = Math.abs(diffrence);
      var deviation = Math.round((diffrence / target_1) * 100);
      if (deviation !== Infinity)
        deviation = deviation
          ? ks_self.ksFormatValue(deviation, "init", 2) + "%"
          : 0 + "%";
    }

    if (
      field.ks_previous_period &&
      ks_valid_date_selection.indexOf(ks_date_filter_selection) >= 0
    ) {
      var previous_period_data = kpi_data[0].previous_period;
      var pre_diffrence = count_1 - previous_period_data;
      if (field.ks_multiplier_active) {
        var previous_period_data =
          kpi_data[0].previous_period * field.ks_multiplier;
        var pre_diffrence =
          count_1 * field.ks_multiplier - previous_period_data;
      }
      var pre_acheive = pre_diffrence > 0 ? true : false;
      pre_diffrence = Math.abs(pre_diffrence);
      var pre_deviation = previous_period_data
        ? ks_self.ksFormatValue(
            parseInt((pre_diffrence / previous_period_data) * 100),
            "init",
            2
          ) + "%"
        : "100%";
    }
    var item = {
      ksIsDashboardManager: ks_self.config.ks_dashboard_manager,
      id: field.id,
    };
    var ks_icon_url;
    if (field.ks_icon_select == "Custom") {
      if (field.ks_icon[0]) {
        ks_icon_url =
          "data:image/" +
          (ks_self.file_type_magic_word[field.ks_icon[0]] || "png") +
          ";base64," +
          field.ks_icon;
      } else {
        ks_icon_url = false;
      }
    } else {
      ks_icon_url = false;
    }
    var target_progress_deviation = String(
      Math.round((count_1 / target_1) * 100)
    );
    if (field.ks_multiplier_active) {
      var target_progress_deviation = String(
        Math.round(((count_1 * field.ks_multiplier) / target_1) * 100)
      );
    }
    var ks_rgba_icon_color = ks_self._ks_get_rgba_format(
      field.ks_default_icon_color
    );
    var item_info = {
      item: item,
      id: field.id,
      count_1: ks_self.ksNumFormatter(kpi_data[0]["record_data"], 1),
      count_1_tooltip: kpi_data[0]["record_data"],
      count_2: kpi_data[1] ? String(kpi_data[1]["record_data"]) : false,
      name: field.name ? field.name : field.ks_model_id.data.display_name,
      target_progress_deviation: target_progress_deviation,
      icon_select: field.ks_icon_select,
      default_icon: field.ks_default_icon,
      icon_color: ks_rgba_icon_color,
      target_deviation: deviation,
      target_arrow: acheive ? "up" : "down",
      ks_enable_goal: field.ks_goal_enable,
      ks_previous_period:
        ks_valid_date_selection.indexOf(ks_date_filter_selection) >= 0
          ? field.ks_previous_period
          : false,
      target: ks_self.ksNumFormatter(target_1, 1),
      previous_period_data: previous_period_data,
      pre_deviation: pre_deviation,
      pre_arrow: pre_acheive ? "up" : "down",
      target_view: field.ks_target_view,
      pre_view: field.ks_prev_view,
      ks_dashboard_list: ks_self.config.ks_dashboard_list,
      ks_icon_url: ks_icon_url,
    };

    if (item_info.target_deviation === Infinity) item_info.target_arrow = false;
    item_info.target_progress_deviation = parseInt(
      item_info.target_progress_deviation
    )
      ? ks_self.ksFormatValue(
          parseInt(item_info.target_progress_deviation),
          "init",
          field.ks_precision_digits
        )
      : "0";
    if (field.ks_multiplier_active) {
      item_info["count_1"] = ks_self._;
      onKsGlobalFormatter(
        kpi_data[0]["record_data"] * field.ks_multiplier,
        field.ks_data_formatting,
        field.ks_precision_digits
      );
      item_info["count_1_tooltip"] =
        kpi_data[0]["record_data"] * field.ks_multiplier;
    } else {
      item_info["count_1"] = ks_self._onKsGlobalFormatter(
        kpi_data[0]["record_data"],
        field.ks_data_formatting,
        field.ks_precision_digits
      );
    }
    item_info["target"] = ks_self._onKsGlobalFormatter(
      kpi_data[0].target,
      field.ks_data_formatting,
      field.ks_precision_digits
    );

    var $kpi_preview;
    if (!kpi_data[1]) {
      if (field.ks_target_view === "Number" || !field.ks_goal_enable) {
        $kpi_preview = $(
          renderToElement(
            "ks_website_dashboard_ninja.Ks_kpi_template",
            item_info
          )
        );
      } else if (
        field.ks_target_view === "Progress Bar" &&
        field.ks_goal_enable
      ) {
        $kpi_preview = $(
          renderToElement(
            "ks_website_dashboard_ninja.Ks_kpi_template_3",
            item_info
          )
        );
        $kpi_preview
          .find("#ks_progressbar")
          .val(parseInt(item_info.target_progress_deviation));
      }

      if (field.ks_goal_enable) {
        if (acheive) {
          $kpi_preview.find(".target_deviation").css({
            color: "green",
          });
        } else {
          $kpi_preview.find(".target_deviation").css({
            color: "red",
          });
        }
      }
      if (
        field.ks_previous_period &&
        String(previous_period_data) &&
        ks_valid_date_selection.indexOf(ks_date_filter_selection) >= 0
      ) {
        if (pre_acheive) {
          $kpi_preview.find(".pre_deviation").css({
            color: "green",
          });
        } else {
          $kpi_preview.find(".pre_deviation").css({
            color: "red",
          });
        }
      }
      if ($kpi_preview.find(".ks_target_previous").children().length !== 2) {
        $kpi_preview
          .find(".ks_target_previous")
          .addClass("justify-content-center");
      }
    } else {
      switch (field.ks_data_comparison) {
        case "None":
          if (field.ks_multiplier_active) {
            var count_tooltip =
              String(count_1 * field.ks_multiplier) +
              "/" +
              String(count_2 * field.ks_multiplier);
            var count =
              String(ks_self.ksNumFormatter(count_1 * field.ks_multiplier, 1)) +
              "/" +
              String(ks_self.ksNumFormatter(count_2 * field.ks_multiplier, 1));
            item_info["count"] =
              String(
                ks_self._onKsGlobalFormatter(
                  count_1 * field.ks_multiplier,
                  field.ks_data_formatting,
                  field.ks_precision_digits
                )
              ) +
              "/" +
              String(
                ks_self._onKsGlobalFormatter(
                  count_2 * field.ks_multiplier,
                  field.ks_data_formatting,
                  field.ks_precision_digits
                )
              );
          } else {
            var count_tooltip = String(count_1) + "/" + String(count_2);
            var count =
              String(ks_self.ksNumFormatter(count_1, 1)) +
              "/" +
              String(ks_self.ksNumFormatter(count_2, 1));
            item_info["count"] =
              String(
                ks_self._onKsGlobalFormatter(
                  count_1,
                  field.ks_data_formatting,
                  field.ks_precision_digits
                )
              ) +
              "/" +
              String(
                ks_self._onKsGlobalFormatter(
                  count_2,
                  field.ks_data_formatting,
                  field.ks_precision_digits
                )
              );
          }
          item_info["count_tooltip"] = count_tooltip;
          item_info["target_enable"] = false;
          $kpi_preview = $(
            renderToElement(
              "ks_website_dashboard_ninja.Ks_kpi_template_2",
              item_info
            )
          );
          break;
        case "Sum":
          $kpi_preview = ks_self.ksSum(
            count_1,
            count_2,
            item_info,
            field,
            target_1,
            $kpi_preview,
            kpi_data
          );
          break;
        case "Percentage":
          $kpi_preview = ks_self.ksPercentage(
            count_1,
            count_2,
            field,
            item_info,
            target_1,
            $kpi_preview,
            kpi_data
          );
          break;
        case "Ratio":
          var gcd = ks_self.ks_get_gcd(
            Math.round(count_1),
            Math.round(count_2)
          );
          if (field.ks_data_formatting == "exact") {
            if (count_1 && count_2) {
              item_info["count_tooltip"] = count_1 / gcd + ":" + count_2 / gcd;
              item_info["count"] =
                ks_self.ksFormatValue(
                  count_1 / gcd,
                  "float",
                  field.ks_precision_digits
                ) +
                ":" +
                ks_self.ksFormatValue(
                  count_2 / gcd,
                  "float",
                  field.ks_precision_digits
                );
            } else {
              item_info["count_tooltip"] = count_1 + ":" + count_2;
              item_info["count"] = count_1 + ":" + count_2;
            }
          } else {
            if (count_1 && count_2) {
              item_info["count_tooltip"] = count_1 / gcd + ":" + count_2 / gcd;
              item_info["count"] =
                ks_self.ksNumFormatter(count_1 / gcd, 1) +
                ":" +
                ks_self.ksNumFormatter(count_2 / gcd, 1);
            } else {
              item_info["count_tooltip"] = count_1 + ":" + count_2;
              item_info["count"] =
                ks_self.ksNumFormatter(count_1, 1) +
                ":" +
                ks_self.ksNumFormatter(count_2, 1);
            }
          }
          item_info["target_enable"] = false;
          $kpi_preview = $(
            renderToElement(
              "ks_website_dashboard_ninja.Ks_kpi_template_2",
              item_info
            )
          );
          break;
      }
    }
    $kpi_preview.find(".ks_dashboarditem_id").css({
      "background-color": ks_rgba_background_color,
      color: ks_rgba_font_color,
    });

    return $kpi_preview;
  },

  ks_get_gcd: function (a, b) {
    return b == 0 ? a : this.ks_get_gcd(b, a % b);
  },
  _renderListView: function (item, grid) {
    var ks_self = this;
    var list_view_data = JSON.parse(item.ks_list_view_data);
    var item_id = item.id,
      pager = true,
      data_rows = list_view_data.data_rows,
      length = data_rows ? data_rows.length : false,
      item_title = item.name;
    if (
      item.ks_data_calculation_type &&
      item.ks_data_calculation_type === "query"
    ) {
      pager = false;
    }
    var $ksItemContainer = ks_self._renderListViewData(item);
    var $ks_gridstack_container = $(
      renderToElement(
        "ks_website_dashboard_ninja.Ks_gridstack_list_view_container",
        {
          ks_chart_title: item_title,
          ksIsDashboardManager: ks_self.config.ks_dashboard_manager,
          ks_dashboard_list: ks_self.config.ks_dashboard_list,
          item_id: item_id,
          count: "1-" + length,
          offset: 1,
          intial_count: length,
          ks_pager: pager,
        }
      )
    ).addClass("ks_dashboarditem_id");
    //            $ks_gridstack_container.find('.ks_pager').addClass('d-none')
    if (item.ks_pagination_limit < length) {
      $ks_gridstack_container
        .find(".ks_load_next")
        .addClass("ks_event_offer_list");
    }
    if (length < item.ks_pagination_limit) {
      $ks_gridstack_container
        .find(".ks_load_next")
        .addClass("ks_event_offer_list");
    }
    if (item.ks_record_data_limit === item.ks_pagination_limit) {
      $ks_gridstack_container
        .find(".ks_load_next")
        .addClass("ks_event_offer_list");
    }
    if (length == 0) {
      $ks_gridstack_container.find(".ks_pager").addClass("d-none");
    }
    if (item.ks_pagination_limit == 0) {
      $ks_gridstack_container.find(".ks_pager_name").addClass("d-none");
    }

    $ks_gridstack_container.find(".card-body").append($ksItemContainer);

    item.$el = $ks_gridstack_container;
    if (item_id in ks_self.gridstackConfig) {
      if (isMobileOS()) {
        grid.addWidget($ks_gridstack_container[0], {
          x: ks_self.gridstackConfig[item_id].x,
          y: ks_self.gridstackConfig[item_id].y,
          w: ks_self.gridstackConfig[item_id].w,
          h: ks_self.gridstackConfig[item_id].h,
          autoPosition: true,
          minW: 3,
          maxW: null,
          minH: 3,
          maxH: null,
          id: item_id,
        });
      } else {
        grid.addWidget($ks_gridstack_container[0], {
          x: ks_self.gridstackConfig[item_id].x,
          y: ks_self.gridstackConfig[item_id].y,
          w: ks_self.gridstackConfig[item_id].w,
          h: ks_self.gridstackConfig[item_id].h,
          autoPosition: false,
          minW: 3,
          maxW: null,
          minH: 3,
          maxH: null,
          id: item_id,
        });
      }
    } else {
      grid.addWidget($ks_gridstack_container[0], {
        x: 0,
        y: 0,
        w: 5,
        h: 4,
        autoPosition: true,
        minW: 3,
        maxW: null,
        minH: 3,
        maxH: null,
        id: item_id,
      });
    }
  },

  _renderListViewData: function (item) {
    var ks_self = this;
    var list_view_data = JSON.parse(item.ks_list_view_data);
    var item_id = item.id,
      data_rows = list_view_data.data_rows,
      item_title = item.name;
    if (item.ks_list_view_type === "ungrouped" && list_view_data) {
      if (list_view_data.date_index) {
        var index_data = list_view_data.date_index;
        for (var i = 0; i < index_data.length; i++) {
          for (var j = 0; j < list_view_data.data_rows.length; j++) {
            var index = index_data[i];
            var index = index_data[i];
            var date = list_view_data.data_rows[j]["data"][index];
            if (date) {
              if (list_view_data.fields_type[index] === "date") {
                list_view_data.data_rows[j]["data"][index] = formatDate(
                  parseDate(date),
                  { format: localization.dateFormat }
                );
              } else {
                list_view_data.data_rows[j]["data"][index] = formatDateTime(
                  parseDateTime(date),
                  { format: localization.dateTimeFormat }
                );
              }
            } else {
              list_view_data.data_rows[j]["data"][index] = "";
            }
          }
        }
      }
    }
    if (list_view_data) {
      for (var i = 0; i < list_view_data.data_rows.length; i++) {
        for (var j = 0; j < list_view_data.data_rows[0]["data"].length; j++) {
          if (
            typeof data_rows[i].data[j] === "number" ||
            list_view_data.data_rows[i].data[j]
          ) {
            if (typeof list_view_data.data_rows[i].data[j] === "number") {
              list_view_data.data_rows[i].data[j] = ks_self.ksFormatValue(
                data_rows[i].data[j],
                "float",
                item.ks_precision_digits
              );
            }
          } else {
            list_view_data.data_rows[i].data[j] = "";
          }
        }
      }
    }
    var ks_data_calculation_type =
      ks_self.config.ks_item_data[item_id].ks_data_calculation_type;
    var $ksItemContainer = $(
      renderToElement("ks_website_dashboard_ninja.Ks_list_view_table", {
        list_view_data: list_view_data,
        item_id: item_id,
        list_type: item.ks_list_view_type,
        calculation_type: ks_data_calculation_type,
        isDrill: ks_self.config.ks_item_data[item_id]["isDrill"],
      })
    );
    ks_self.list_container = $ksItemContainer;
    if (list_view_data) {
      var $ksitemBody = ks_self.ksListViewBody(list_view_data, item_id);
      ks_self.list_container.find(".ks_table_body").append($ksitemBody);
    }
    if (item.ks_list_view_type === "ungrouped") {
      $ksItemContainer
        .find(".ks_list_canvas_click")
        .removeClass("ks_list_canvas_click");
    }

    $ksItemContainer.find("#ks_item_info").hide();

    return $ksItemContainer;
  },

  ksListViewBody: function (list_view_data, item_id) {
    var self = this;
    var itemid = item_id;
    var ks_data_calculation_type =
      self.config.ks_item_data[item_id].ks_data_calculation_type;
    var $ksitemBody = $(
      renderToFragment("ks_website_dashboard_ninja.Ks_list_view_tmpl", {
        list_view_data: list_view_data,
        item_id: itemid,
        calculation_type: ks_data_calculation_type,
        isDrill: self.config.ks_item_data[item_id]["isDrill"],
      })
    );
    return $ksitemBody;
  },
    _renderGraph: function (item) {
    var self = this;
    var chart_data = JSON.parse(item.ks_chart_data);
    var isDrill = item.isDrill ? item.isDrill : false;
    var chart_id = item.id,
      chart_title = item.name;
    var chart_title = item.name;
    var chart_type = item.ks_dashboard_item_type.split("_")[1];
    var $ks_gridstack_container = $(
      renderToElement("ks_website_dashboard_ninja.Ks_gridstack_container", {
        ks_chart_title: chart_title,
        ksIsDashboardManager: self.config.ks_dashboard_manager,
        ks_dashboard_list: self.config.ks_dashboard_list,
        chart_id: chart_id,
        ksChartColorOptions: this.ksChartColorOptions,
      })
    ).addClass("ks_dashboarditem_id");
    $ks_gridstack_container
      .find(".ks_li_" + item.ks_chart_item_color)
      .addClass("ks_date_filter_selected");

    if (chart_id in self.gridstackConfig) {
      if (isMobileOS()) {
        self.grid.addWidget($ks_gridstack_container[0], {
          x: self.gridstackConfig[chart_id].x,
          y: self.gridstackConfig[chart_id].y,
          w: self.gridstackConfig[chart_id].w,
          h: self.gridstackConfig[chart_id].h,
          autoPosition: true,
          minW: 4,
          maxW: null,
          minH: 3,
          maxH: null,
          id: chart_id,
        });
      } else {
        self.grid.addWidget($ks_gridstack_container[0], {
          x: self.gridstackConfig[chart_id].x,
          y: self.gridstackConfig[chart_id].y,
          w: self.gridstackConfig[chart_id].w,
          h: self.gridstackConfig[chart_id].h,
          autoPosition: false,
          minW: 4,
          maxW: null,
          minH: 3,
          maxH: null,
          id: chart_id,
        });
      }
    } else {
      self.grid.addWidget($ks_gridstack_container[0], {
        x: 0,
        y: 0,
        w: 5,
        h: 4,
        autoPosition: true,
        minW: 4,
        maxW: null,
        minH: 3,
        maxH: null,
        id: chart_id,
      });
    }
    if (item.ks_dashboard_item_type == "ks_funnel_chart") {
      this.ksrenderfunnelchart($ks_gridstack_container, item);
    } else if (item.ks_dashboard_item_type == "ks_map_view") {
      this.ksrendermapview($ks_gridstack_container, item);
    } else {
      this.ks_render_graphs($ks_gridstack_container, item);
    }
  },
  ks_render_graphs($ks_gridstack_container, item) {
    var self = this;
    if ($ks_gridstack_container.find(".ks_chart_card_body").length) {
      var graph_render = $ks_gridstack_container.find(".ks_chart_card_body");
    } else {
      $(
        $ks_gridstack_container.find(".ks_dashboarditem_chart_container")[0]
      ).append("<div class='card-body ks_chart_card_body'>");
      var graph_render = $ks_gridstack_container.find(".ks_chart_card_body");
    }
    const chart_data = JSON.parse(item.ks_chart_data);
    var ks_labels = chart_data["labels"];
    var ks_data = chart_data.datasets;

    let data = [];
    if (ks_data && ks_labels) {
      if (ks_data.length && ks_labels.length) {
        for (let i = 0; i < ks_labels.length; i++) {
          let data2 = {};
          for (let j = 0; j < ks_data.length; j++) {
            if (ks_data[j].type == "line") {
              data2[ks_data[j].label + "line"] = ks_data[j].data[i];
            } else {
              data2[ks_data[j].label] = ks_data[j].data[i];
            }
          }
          data2["category"] = ks_labels[i];
          data.push(data2);
        }

        const root = am5.Root.new(graph_render[0]);
        var self = this;
        const theme = item.ks_chart_item_color;
        switch (theme) {
          case "default":
            root.setThemes([am5themes_Animated.new(root)]);
            break;
          case "dark":
            root.setThemes([am5themes_Dataviz.new(root)]);
            break;
          case "material":
            root.setThemes([am5themes_Material.new(root)]);
            break;
          case "moonrise":
            root.setThemes([am5themes_Moonrise.new(root)]);
            break;
        }
        var chart_type = item.ks_dashboard_item_type;
        switch (chart_type) {
          case "ks_bar_chart":
          case "ks_bullet_chart":
            var chart = root.container.children.push(
              am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: root.verticalLayout,
              })
            );

            var xRenderer = am5xy.AxisRendererX.new(root, {
              cellStartLocation: 0.1,
              cellEndLocation: 0.9,
            });

            var xAxis = chart.xAxes.push(
              am5xy.CategoryAxis.new(root, {
                categoryField: "category",
                renderer: xRenderer,
                tooltip: am5.Tooltip.new(root, {}),
              })
            );

            xRenderer.grid.template.setAll({ location: 1 });

            xAxis.data.setAll(data);

            var yAxis = chart.yAxes.push(
              am5xy.ValueAxis.new(root, {
                min: 0,
                extraMax: 0.1,
                renderer: am5xy.AxisRendererY.new(root, { strokeOpacity: 0.1 }),
              })
            );

            // Add series

            for (let k = 0; k < ks_data.length; k++) {
              if (
                item.ks_dashboard_item_type == "ks_bar_chart" &&
                item.ks_bar_chart_stacked == true &&
                ks_data[k].type != "line"
              ) {
                var series = chart.series.push(
                  am5xy.ColumnSeries.new(root, {
                    stacked: true,
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label}`,
                    categoryXField: "category",
                    tooltip: am5.Tooltip.new(root, {
                      pointerOrientation: "horizontal",
                      labelText: "{categoryX}, {name}: {valueY}",
                    }),
                  })
                );
                series.columns.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series.data.setAll(data);
              } else if (
                item.ks_dashboard_item_type == "ks_bar_chart" &&
                ks_data[k].type != "line"
              ) {
                var series = chart.series.push(
                  am5xy.ColumnSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label}`,
                    categoryXField: "category",
                    tooltip: am5.Tooltip.new(root, {
                      pointerOrientation: "horizontal",
                      labelText: "{categoryX}, {name}: {valueY}",
                    }),
                  })
                );
                series.columns.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series.data.setAll(data);
              } else if (item.ks_dashboard_item_type == "ks_bullet_chart") {
                var series = chart.series.push(
                  am5xy.ColumnSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label}`,
                    categoryXField: "category",
                    clustered: false,
                    tooltip: am5.Tooltip.new(root, {
                      labelText: `${ks_data[k].label}: {valueY}`,
                    }),
                  })
                );

                series.columns.template.setAll({
                  width: am5.percent(80 - 10 * k),
                  tooltipY: 0,
                  strokeOpacity: 0,
                });
                series.columns.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series.data.setAll(data);
              }

              if (item.ks_show_records == true && series) {
                series.columns.template.setAll({
                  tooltipY: 0,
                  templateField: "columnSettings",
                });
                var cursor = chart.set(
                  "cursor",
                  am5xy.XYCursor.new(root, {
                    behavior: "zoomY",
                  })
                );
                cursor.lineY.set("forceHidden", true);
                cursor.lineX.set("forceHidden", true);
              }

              if (
                item.ks_dashboard_item_type == "ks_bar_chart" &&
                item.ks_chart_measure_field_2 &&
                ks_data[k].type == "line"
              ) {
                var series2 = chart.series.push(
                  am5xy.LineSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label + "line"}`,
                    categoryXField: "category",
                    tooltip: am5.Tooltip.new(root, {
                      pointerOrientation: "horizontal",
                      labelText: "{categoryX}, {name}: {valueY}",
                    }),
                  })
                );

                series2.strokes.template.setAll({
                  strokeWidth: 3,
                  templateField: "strokeSettings",
                });
                series2.strokes.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series2.data.setAll(data);

                series2.bullets.push(function () {
                  return am5.Bullet.new(root, {
                    sprite: am5.Circle.new(root, {
                      strokeWidth: 3,
                      stroke: series2.get("stroke"),
                      radius: 5,
                      fill: root.interfaceColors.get("background"),
                    }),
                  });
                });
              }
            }
            break;
          case "ks_horizontalBar_chart":
            var chart = root.container.children.push(
              am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: root.verticalLayout,
              })
            );
            var yAxis = chart.yAxes.push(
              am5xy.CategoryAxis.new(root, {
                categoryField: "category",
                renderer: am5xy.AxisRendererY.new(root, {
                  inversed: true,
                  cellStartLocation: 0.1,
                  cellEndLocation: 0.9,
                }),
              })
            );

            yAxis.data.setAll(data);

            var xAxis = chart.xAxes.push(
              am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, {
                  strokeOpacity: 0.1,
                }),
                min: 0,
              })
            );
            for (let k = 0; k < ks_data.length; k++) {
              if (item.ks_bar_chart_stacked == true) {
                var series = chart.series.push(
                  am5xy.ColumnSeries.new(root, {
                    stacked: true,
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueXField: `${ks_data[k].label}`,
                    categoryYField: "category",
                    sequencedInterpolation: true,
                    tooltip: am5.Tooltip.new(root, {
                      pointerOrientation: "horizontal",
                      labelText: "{categoryY}, {name}: {valueX}",
                    }),
                  })
                );
              } else {
                var series = chart.series.push(
                  am5xy.ColumnSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueXField: `${ks_data[k].label}`,
                    categoryYField: "category",
                    sequencedInterpolation: true,
                    tooltip: am5.Tooltip.new(root, {
                      pointerOrientation: "horizontal",
                      labelText: "{categoryY}, {name}: {valueX}",
                    }),
                  })
                );
              }
              if (item.ks_show_records == true && series) {
                series.columns.template.setAll({
                  //                        width: am5.percent(80-(10*k)),
                  height: am5.p100,
                  strokeOpacity: 0,
                });
                var cursor = chart.set(
                  "cursor",
                  am5xy.XYCursor.new(root, {
                    behavior: "zoomY",
                  })
                );
                cursor.lineY.set("forceHidden", true);
                cursor.lineX.set("forceHidden", true);
              }
              series.columns.template.events.on("click", function (ev) {
                if (
                  item.ks_data_calculation_type === "custom" &&
                  !self.config["ks_ai_dashboard"]
                ) {
                  self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                }
              });
              series.data.setAll(data);
            }
            break;
          case "ks_line_chart":
          case "ks_area_chart":
            var chart = root.container.children.push(
              am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: root.verticalLayout,
              })
            );
            var xAxis = chart.xAxes.push(
              am5xy.CategoryAxis.new(root, {
                categoryField: "category",
                maxDeviation: 0.2,
                renderer: am5xy.AxisRendererX.new(root, {}),
                tooltip: am5.Tooltip.new(root, {}),
              })
            );
            xAxis.data.setAll(data);

            var yAxis = chart.yAxes.push(
              am5xy.ValueAxis.new(root, {
                min: 0,
                extraMax: 0.1,
                renderer: am5xy.AxisRendererY.new(root, { strokeOpacity: 0.1 }),
              })
            );

            for (let k = 0; k < ks_data.length; k++) {
              var series = chart.series.push(
                am5xy.LineSeries.new(root, {
                  name: `${ks_data[k].label}`,
                  xAxis: xAxis,
                  yAxis: yAxis,
                  valueYField: `${ks_data[k].label}`,
                  categoryXField: "category",
                  alignLabels: true,
                  tooltip: am5.Tooltip.new(root, {
                    labelText: "[bold]{categoryX}[/]\n{name}: {valueY}",
                  }),
                })
              );
              series.strokes.template.setAll({
                strokeWidth: 2,
                templateField: "strokeSettings",
              });

              series.bullets.push(function () {
                var graphics = am5.Rectangle.new(root, {
                  width: 7,
                  height: 7,
                  centerX: am5.p50,
                  centerY: am5.p50,
                  fill: series.get("stroke"),
                });
                if (
                  item.ks_dashboard_item_type == "ks_area_chart" ||
                  item.ks_dashboard_item_type == "ks_line_chart"
                ) {
                  graphics.events.on("click", function (ev) {
                    if (
                      item.ks_data_calculation_type === "custom" &&
                      !self.config["ks_ai_dashboard"]
                    ) {
                      self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                    }
                  });
                }
                return am5.Bullet.new(root, {
                  sprite: graphics,
                });
              });
              if (item.ks_dashboard_item_type === "ks_area_chart") {
                series.fills.template.setAll({
                  fillOpacity: 0.5,
                  visible: true,
                });
              }

              series.data.setAll(data);
            }

            if (item.ks_show_records == true) {
              var cursor = chart.set(
                "cursor",
                am5xy.XYCursor.new(root, {
                  behavior: "none",
                })
              );
              cursor.lineY.set("forceHidden", true);
              cursor.lineX.set("forceHidden", true);
            }
            break;
          case "ks_pie_chart":
          case "ks_doughnut_chart":
            var series = [];
            if (
              item.ks_semi_circle_chart == true &&
              (item.ks_dashboard_item_type == "ks_pie_chart" ||
                item.ks_dashboard_item_type == "ks_doughnut_chart")
            ) {
              if (item.ks_dashboard_item_type == "ks_doughnut_chart") {
                var chart = root.container.children.push(
                  am5percent.PieChart.new(root, {
                    innerRadius: am5.percent(50),
                    layout: root.verticalLayout,
                    startAngle: 180,
                    endAngle: 360,
                  })
                );
              } else {
                var chart = root.container.children.push(
                  am5percent.PieChart.new(root, {
                    radius: am5.percent(90),
                    layout: root.verticalLayout,
                    startAngle: 180,
                    endAngle: 360,
                  })
                );
              }
              for (let k = 0; k < ks_data.length; k++) {
                series[k] = chart.series.push(
                  am5percent.PieSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    valueField: `${ks_data[k].label}`,
                    categoryField: "category",
                    alignLabels: true,
                    startAngle: 180,
                    endAngle: 360,
                  })
                );
              }
            } else {
              if (item.ks_dashboard_item_type == "ks_doughnut_chart") {
                var chart = root.container.children.push(
                  am5percent.PieChart.new(root, {
                    innerRadius: am5.percent(50),
                    layout: root.verticalLayout,
                  })
                );
              } else {
                var chart = root.container.children.push(
                  am5percent.PieChart.new(root, {
                    radius: am5.percent(90),
                    layout: root.verticalLayout,
                  })
                );
              }
              for (let k = 0; k < ks_data.length; k++) {
                series[k] = chart.series.push(
                  am5percent.PieSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    valueField: `${ks_data[k].label}`,
                    categoryField: "category",
                    alignLabels: true,
                  })
                );
              }
            }
            var bgColor = root.interfaceColors.get("background");
            for (let rec of series) {
              rec.ticks.template.setAll({ forceHidden: true });
              rec.labels.template.setAll({ forceHidden: true });
              rec.slices.template.setAll({
                stroke: bgColor,
                strokeWidth: 2,
                templateField: "settings",
              });
              rec.slices.template.events.on("click", function (ev) {
                rec.slices.each(function (slice) {
                  if (
                    slice == ev.target &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
              });

              if (item.ks_show_records == true) {
                rec.slices.template.setAll({
                  tooltipText: "[bold]{category}[/]\n{name}: {value}",
                });
              }
              rec.data.setAll(data);
              rec.appear(1000, 100);
            }
            break;
          case "ks_polarArea_chart":
          case "ks_radar_view":
          case "ks_flower_view":
          case "ks_radialBar_chart":
            var chart = root.container.children.push(
              am5radar.RadarChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX",
                radius: am5.percent(80),
                //                        layout: root.verticalLayout,
              })
            );

            if (item.ks_dashboard_item_type == "ks_flower_view") {
              var xRenderer = am5radar.AxisRendererCircular.new(root, {});
              xRenderer.labels.template.setAll({
                radius: 10,
                cellStartLocation: 0.2,
                cellEndLocation: 0.8,
              });
            } else if (item.ks_dashboard_item_type == "ks_radialBar_chart") {
              var xRenderer = am5radar.AxisRendererCircular.new(root, {
                strokeOpacity: 0.1,
                minGridDistance: 50,
              });
              xRenderer.labels.template.setAll({
                radius: 23,
                maxPosition: 0.98,
              });
            } else {
              var xRenderer = am5radar.AxisRendererCircular.new(root, {});
              xRenderer.labels.template.setAll({
                radius: 10,
              });
            }
            if (item.ks_dashboard_item_type == "ks_radialBar_chart") {
              var xAxis = chart.xAxes.push(
                am5xy.ValueAxis.new(root, {
                  renderer: xRenderer,
                  extraMax: 0.1,
                  tooltip: am5.Tooltip.new(root, {}),
                })
              );

              var yAxis = chart.yAxes.push(
                am5xy.CategoryAxis.new(root, {
                  categoryField: "category",
                  renderer: am5radar.AxisRendererRadial.new(root, {
                    minGridDistance: 20,
                  }),
                })
              );
              yAxis.get("renderer").labels.template.setAll({
                oversizedBehavior: "truncate",
                textAlign: "center",
                maxWidth: 150,
                ellipsis: "...",
              });
            } else {
              var xAxis = chart.xAxes.push(
                am5xy.CategoryAxis.new(root, {
                  maxDeviation: 0,
                  categoryField: "category",
                  renderer: xRenderer,
                  tooltip: am5.Tooltip.new(root, {}),
                })
              );
              xAxis.data.setAll(data);

              var yAxis = chart.yAxes.push(
                am5xy.ValueAxis.new(root, {
                  renderer: am5radar.AxisRendererRadial.new(root, {}),
                })
              );
            }
            if (item.ks_dashboard_item_type == "ks_polarArea_chart") {
              for (let k = 0; k < ks_data.length; k++) {
                var series = chart.series.push(
                  am5radar.RadarColumnSeries.new(root, {
                    stacked: true,
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label}`,
                    categoryXField: "category",
                    alignLabels: true,
                  })
                );

                series.set("stroke", root.interfaceColors.get("background"));
                if (item.ks_show_records == true) {
                  series.columns.template.setAll({
                    width: am5.p100,
                    strokeOpacity: 0.1,
                    tooltipText: "{name}: {valueY}",
                  });
                }
                series.columns.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series.data.setAll(data);
              }
              xAxis.data.setAll(data);
            } else if (item.ks_dashboard_item_type == "ks_flower_view") {
              for (let k = 0; k < ks_data.length; k++) {
                var series = chart.series.push(
                  am5radar.RadarColumnSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label}`,
                    categoryXField: "category",
                  })
                );

                series.columns.template.setAll({
                  tooltipText: "{name}: {valueY}",
                  width: am5.percent(100),
                });
                series.columns.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series.data.setAll(data);
              }
            } else if (item.ks_dashboard_item_type == "ks_radialBar_chart") {
              for (let k = 0; k < ks_data.length; k++) {
                var series = chart.series.push(
                  am5radar.RadarColumnSeries.new(root, {
                    stacked: true,
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueXField: `${ks_data[k].label}`,
                    categoryYField: "category",
                  })
                );

                series.set("stroke", root.interfaceColors.get("background"));
                series.columns.template.setAll({
                  width: am5.p100,
                  strokeOpacity: 0.1,
                  tooltipText: "{name}: {valueX}  {category}",
                });
                series.columns.template.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                series.data.setAll(data);
              }
              yAxis.data.setAll(data);
            } else {
              for (let k = 0; k < ks_data.length; k++) {
                var series = chart.series.push(
                  am5radar.RadarLineSeries.new(root, {
                    name: `${ks_data[k].label}`,
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: `${ks_data[k].label}`,
                    categoryXField: "category",
                    alignLabels: true,
                    tooltip: am5.Tooltip.new(root, {
                      labelText: "{valueY}",
                    }),
                  })
                );

                series.strokes.template.setAll({
                  strokeWidth: 2,
                });
                series.bullets.push(function () {
                  var graphics = am5.Circle.new(root, {
                    fill: series.get("fill"),
                    radius: 5,
                  });
                  graphics.events.on("click", function (ev) {
                    if (
                      item.ks_data_calculation_type === "custom" &&
                      !self.config["ks_ai_dashboard"]
                    ) {
                      self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                    }
                  });
                  return am5.Bullet.new(root, {
                    sprite: graphics,
                  });
                });
                series.data.setAll(data);
              }
              xAxis.data.setAll(data);
            }

            break;

          case "ks_scatter_chart":
            var chart = root.container.children.push(
              am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: root.verticalLayout,
              })
            );
            var xAxis = chart.xAxes.push(
              am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, {
                  minGridDistance: 50,
                }),
                tooltip: am5.Tooltip.new(root, {}),
              })
            );
            xAxis.ghostLabel.set("forceHidden", true);

            var yAxis = chart.yAxes.push(
              am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {}),
                tooltip: am5.Tooltip.new(root, {}),
              })
            );
            yAxis.ghostLabel.set("forceHidden", true);

            for (let k = 0; k < ks_data.length; k++) {
              var series = chart.series.push(
                am5xy.LineSeries.new(root, {
                  name: `${ks_data[k].label}`,
                  name_1: chart_data.groupby,
                  calculateAggregates: true,
                  xAxis: xAxis,
                  yAxis: yAxis,
                  valueYField: `${ks_data[k].label}`,
                  valueXField: "category",
                  tooltip: am5.Tooltip.new(root, {
                    labelText: "{name_1}:{valueX} {name}:{valueY}",
                  }),
                })
              );

              series.bullets.push(function () {
                var graphics = am5.Triangle.new(root, {
                  fill: series.get("fill"),
                  width: 10,
                  height: 7,
                });
                graphics.events.on("click", function (ev) {
                  if (
                    item.ks_data_calculation_type === "custom" &&
                    !self.config["ks_ai_dashboard"]
                  ) {
                    self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
                  }
                });
                return am5.Bullet.new(root, {
                  sprite: graphics,
                });
              });
              var cursor = chart.set(
                "cursor",
                am5xy.XYCursor.new(root, {
                  behavior: "none",
                  snapToSeries: [series],
                })
              );
              cursor.lineY.set("forceHidden", true);
              cursor.lineX.set("forceHidden", true);
              series.strokes.template.set("strokeOpacity", 0);
              series.data.setAll(data);
            }
            break;
        }
        var legend = chart.children.push(
          am5.Legend.new(root, {
            centerX: am5.p50,
            x: am5.p50,
            layout: root.gridLayout,
            y: am5.percent(100),
            centerY: am5.percent(100),
          })
        );
        if (item.ks_hide_legend == true && series) {
          legend.data.setAll(chart.series.values);
        }

        if (item.ks_data_format && item.ks_data_format == "global") {
          root.numberFormatter.setAll({
            numberFormat: "#a",
            bigNumberPrefixes: [
              { number: 1e3, suffix: "k" },
              { number: 1e6, suffix: "M" },
              { number: 1e9, suffix: "G" },
              { number: 1e12, suffix: "T" },
              { number: 1e15, suffix: "P" },
              { number: 1e18, suffix: "E" },
            ],
          });
        } else if (item.ks_data_format && item.ks_data_format == "indian") {
          root.numberFormatter.setAll({
            numberFormat: "#a",
            bigNumberPrefixes: [
              { number: 1e3, suffix: "Th" },
              { number: 1e5, suffix: "Lakh" },
              { number: 1e7, suffix: "Cr" },
              { number: 1e9, suffix: "Arab" },
            ],
          });
        } else if (item.ks_data_format && item.ks_data_format == "colombian") {
          root.numberFormatter.setAll({
            numberFormat: "#a",
            bigNumberPrefixes: [
              { number: 1e6, suffix: "M" },
              { number: 1e9, suffix: "M" },
              { number: 1e12, suffix: "M" },
              { number: 1e15, suffix: "M" },
              { number: 1e18, suffix: "M" },
            ],
          });
        } else {
          root.numberFormatter.setAll({
            numberFormat: "#",
          });
        }
        chart.appear(1000, 100);

        if (
          item.ks_dashboard_item_type != "ks_pie_chart" &&
          item.ks_dashboard_item_type != "ks_doughnut_chart" &&
          series
        ) {
          series.appear();
        }
        //            this.chart_container[item.id] = chart;
        $ks_gridstack_container
          .find(".ks_li_" + item.ks_chart_item_color)
          .addClass("ks_date_filter_selected");
      } else {
        $ks_gridstack_container
          .find(".ks_chart_card_body")
          .append($("<div class='graph_text'>").text("No Data Available."));
      }
    } else {
      $ks_gridstack_container
        .find(".ks_chart_card_body")
        .append($("<div class='graph_text'>").text("No Data Available."));
    }
    return $ks_gridstack_container;
  },
  ksrenderfunnelchart($ks_gridstack_container, item) {
    var self = this;
    if ($ks_gridstack_container.find(".ks_chart_card_body").length) {
      var funnelRender = $ks_gridstack_container.find(".ks_chart_card_body");
    } else {
      $(
        $ks_gridstack_container.find(".ks_dashboarditem_chart_container")[0]
      ).append("<div class='card-body ks_chart_card_body'>");
      var funnelRender = $ks_gridstack_container.find(".ks_chart_card_body");
    }
    var funnel_data = JSON.parse(item.ks_chart_data);
    if (funnel_data["labels"] && funnel_data["datasets"]) {
      var ks_labels = funnel_data["labels"];
      var ks_data = funnel_data.datasets[0].data;
      const ks_sortobj = Object.fromEntries(
        ks_labels.map((key, index) => [key, ks_data[index]])
      );
      const keyValueArray = Object.entries(ks_sortobj);
      keyValueArray.sort((a, b) => b[1] - a[1]);

      var data = [];
      if (keyValueArray.length) {
        for (let i = 0; i < keyValueArray.length; i++) {
          data.push({
            stage: keyValueArray[i][0],
            applicants: keyValueArray[i][1],
          });
        }
        const root = am5.Root.new(funnelRender[0]);
        const theme = item.ks_chart_item_color;
        switch (theme) {
          case "default":
            root.setThemes([am5themes_Animated.new(root)]);
            break;
          case "dark":
            root.setThemes([am5themes_Dataviz.new(root)]);
            break;
          case "material":
            root.setThemes([am5themes_Material.new(root)]);
            break;
          case "moonrise":
            root.setThemes([am5themes_Moonrise.new(root)]);
            break;
        }

        var chart = root.container.children.push(
          am5percent.SlicedChart.new(root, {
            layout: root.verticalLayout,
          })
        );
        // Create series
        var series = chart.series.push(
          am5percent.FunnelSeries.new(root, {
            alignLabels: false,
            name: "Series",
            valueField: "applicants",
            categoryField: "stage",
            orientation: "vertical",
          })
        );
        series.data.setAll(data);
        if (item.ks_show_data_value && item.ks_data_label_type == "value") {
          series.labels.template.set("text", "{category}: {value}");
        } else if (
          item.ks_show_data_value &&
          item.ks_data_label_type == "percent"
        ) {
          series.labels.template.set(
            "text",
            "{category}: {valuePercentTotal.formatNumber('0.00')}%"
          );
        } else {
          series.ticks.template.set("forceHidden", true);
          series.labels.template.set("forceHidden", true);
        }
        var legend = chart.children.push(
          am5.Legend.new(root, {
            centerX: am5.p50,
            x: am5.p50,
            marginTop: 15,
            marginBottom: 15,
          })
        );
        if (item.ks_hide_legend == true) {
          legend.data.setAll(series.dataItems);
        }
        chart.appear(1000, 100);
        this.chart_container[item.id] = chart;
        series.slices._values.forEach((rec) => {
          rec.events.on("click", function (ev) {
            if (
              item.ks_data_calculation_type === "custom" &&
              !self.config["ks_ai_dashboard"]
            ) {
              self.onChartCanvasClick_funnel(ev, `${item.id}`, item);
            }
          });
        });
      } else {
        $ks_gridstack_container
          .find(".ks_chart_card_body")
          .append($("<div class='funnel_text'>").text("No Data Available."));
      }
    } else {
      $ks_gridstack_container
        .find(".ks_chart_card_body")
        .append($("<div class='funnel_text'>").text("No Data Available."));
    }
    return $ks_gridstack_container;
  },
  async ksrendermapview($ks_map_view_tmpl, item) {
    var self = this;
    if ($ks_map_view_tmpl.find(".ks_chart_card_body").length) {
      var mapRender = $ks_map_view_tmpl.find(".ks_chart_card_body");
    } else {
      $($ks_map_view_tmpl.find(".ks_dashboarditem_chart_container")[0]).append(
        "<div class='card-body ks_chart_card_body'>"
      );
      var mapRender = $ks_map_view_tmpl.find(".ks_chart_card_body");
    }
    var map_data = JSON.parse(item.ks_chart_data);
    var ks_data = [];
    let data = [];
    let label_data = [];
    let query_label_data = [];
    let domain = [];
    let partner_domain = [];
    var partners = [];
    if (map_data.groupByIds) {
      partners = map_data["partner"];
    }
    var partners_query = [];
    partners_query = map_data["ks_partners_map"];
    var ks_labels = map_data["labels"];
    if (map_data.datasets.length) {
      var ks_data = map_data.datasets[0].data;
    }
    if (item.ks_data_calculation_type === "query") {
      for (let i = 0; i < ks_labels.length; i++) {
        if (ks_labels[i] !== false) {
          if (typeof ks_labels[i] == "string") {
            if (ks_labels[i].includes(",")) {
              ks_labels[i] = ks_labels[i].split(", ")[1];
            }
            query_label_data.push(ks_labels[i]);
          } else {
            query_label_data.push(ks_labels[i]);
          }
        }
      }
      for (let i = 0; i < query_label_data.length; i++) {
        if (typeof query_label_data[i] == "string") {
          for (let j = 0; j < partners_query.length; j++) {
            if (query_label_data[i] == partners_query[j].name) {
              data.push({
                title: query_label_data[i],
                latitude: partners_query[j].partner_latitude,
                longitude: partners_query[j].partner_longitude,
              });
            }
          }
        } else {
          data.push({
            title: query_label_data[i],
            latitude: partners_query[i].partner_latitude,
            longitude: partners_query[i].partner_longitude,
          });
        }
      }
    }
    if (ks_data.length && ks_labels.length) {
      if (item.ks_data_calculation_type !== "query") {
        for (let i = 0; i < ks_labels.length; i++) {
          if (ks_labels[i] !== false) {
            if (ks_labels[i].includes(",")) {
              ks_labels[i] = ks_labels[i].split(", ")[1];
            }
            label_data.push({ title: ks_labels[i], value: ks_data[i] });
          }
        }
        for (let i = 0; i < label_data.length; i++) {
          for (let j = 0; j < partners.length; j++) {
            if (label_data[i].title == partners[j].name) {
              partners[j].name = partners[j].name + ";" + label_data[i].value;
            }
          }
        }
        for (let i = 0; i < partners.length; i++) {
          data.push({
            title: partners[i].name,
            latitude: partners[i].partner_latitude,
            longitude: partners[i].partner_longitude,
          });
        }
      }
      const root = am5.Root.new(mapRender[0]);
      root.setThemes([am5themes_Animated.new(root)]);

      // Create the map chart
      var chart = root.container.children.push(
        am5map.MapChart.new(root, {
          panX: "translateX",
          panY: "translateY",
          projection: am5map.geoMercator(),
        })
      );

      var cont = chart.children.push(
        am5.Container.new(root, {
          layout: root.horizontalLayout,
          x: 20,
          y: 40,
        })
      );

      // Add labels and controls
      cont.children.push(
        am5.Label.new(root, {
          centerY: am5.p50,
          text: "Map",
        })
      );

      var switchButton = cont.children.push(
        am5.Button.new(root, {
          themeTags: ["switch"],
          centerY: am5.p50,
          icon: am5.Circle.new(root, {
            themeTags: ["icon"],
          }),
        })
      );

      switchButton.on("active", function () {
        if (!switchButton.get("active")) {
          chart.set("projection", am5map.geoMercator());
          chart.set("panY", "translateY");
          chart.set("rotationY", 0);
          backgroundSeries.mapPolygons.template.set("fillOpacity", 0);
        } else {
          chart.set("projection", am5map.geoOrthographic());
          chart.set("panY", "rotateY");

          backgroundSeries.mapPolygons.template.set("fillOpacity", 0.1);
        }
      });

      cont.children.push(
        am5.Label.new(root, {
          centerY: am5.p50,
          text: "Globe",
        })
      );

      // Create series for background fill
      var backgroundSeries = chart.series.push(
        am5map.MapPolygonSeries.new(root, {})
      );
      backgroundSeries.mapPolygons.template.setAll({
        fill: root.interfaceColors.get("alternativeBackground"),
        fillOpacity: 0,
        strokeOpacity: 0,
      });

      // Add background polygon
      backgroundSeries.data.push({
        geometry: am5map.getGeoRectangle(90, 180, -90, -180),
      });

      // Create main polygon series for countries
      var polygonSeries = chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow,
          exclude: ["AQ"],
        })
      );
      polygonSeries.mapPolygons.template.setAll({
        tooltipText: "{name}",
        toggleKey: "active",
        interactive: true,
      });

      polygonSeries.mapPolygons.template.states.create("hover", {
        fill: root.interfaceColors.get("primaryButtonHover"),
      });

      polygonSeries.mapPolygons.template.states.create("active", {
        fill: root.interfaceColors.get("primaryButtonHover"),
      });

      var previousPolygon;

      polygonSeries.mapPolygons.template.on(
        "active",
        function (active, target) {
          if (previousPolygon && previousPolygon != target) {
            previousPolygon.set("active", false);
          }
          if (target.get("active")) {
            polygonSeries.zoomToDataItem(target.dataItem);
          } else {
            chart.goHome();
          }
          previousPolygon = target;
        }
      );

      // Create line series for trajectory lines
      var lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
      lineSeries.mapLines.template.setAll({
        stroke: root.interfaceColors.get("alternativeBackground"),
        strokeOpacity: 0.3,
      });

      // Create point series for markers
      var pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
      var colorset = am5.ColorSet.new(root, {});
      const self = root;

      pointSeries.bullets.push(function () {
        var container = am5.Container.new(self, {
          tooltipText: "{title}",
          cursorOverStyle: "pointer",
        });

        var circle = container.children.push(
          am5.Circle.new(self, {
            radius: 4,
            tooltipY: 0,
            fill: colorset.next(),
            strokeOpacity: 0,
          })
        );

        var circle2 = container.children.push(
          am5.Circle.new(self, {
            radius: 4,
            tooltipY: 0,
            fill: colorset.next(),
            strokeOpacity: 0,
            tooltipText: "{title}",
          })
        );

        circle.animate({
          key: "scale",
          from: 1,
          to: 5,
          duration: 600,
          easing: am5.ease.out(am5.ease.cubic),
          loops: Infinity,
        });

        circle.animate({
          key: "opacity",
          from: 1,
          to: 0.1,
          duration: 600,
          easing: am5.ease.out(am5.ease.cubic),
          loops: Infinity,
        });

        return am5.Bullet.new(self, {
          sprite: container,
        });
      });

      for (var i = 0; i < data.length; i++) {
        var final_data = data[i];
        addCity(final_data.longitude, final_data.latitude, final_data.title);
      }
      function addCity(longitude, latitude, title) {
        pointSeries.data.push({
          geometry: { type: "Point", coordinates: [longitude, latitude] },
          title: title,
        });
      }

      // Add zoom control
      chart.set("zoomControl", am5map.ZoomControl.new(root, {}));

      // Set clicking on "water" to zoom out
      chart.chartContainer.get("background").events.on("click", function () {
        chart.goHome();
      });

      // Make stuff animate on load
      chart.appear(1000, 100);
      this.chart_container[item.id] = chart;
      //                $ks_map_view_tmpl.find('.ks_li_' + item.ks_flower_item_color).addClass('ks_date_filter_selected');
    } else {
      $ks_map_view_tmpl
        .find(".ks_chart_card_body")
        .append($("<div class='map_text'>").text("No Data Available."));
    }
    //       }else{
    //        $ks_map_view_tmpl.find('.ks_chart_card_body').append($("<div class='map_text'>").text("Please select Groupby that has Address."))}
    return $ks_map_view_tmpl;
  },


        destroy: function () {
            this._super.apply(this, arguments);
    },


        ksFetchUpdateItem: function(id) {
            var ks_self = this;
            var item_data = ks_self.config.ks_item_data[id];
            var params = ks_self.ksGetParamsForItemFetch(parseInt(item_data.id));
            return jsonrpc('/fetch/item/update', {
                model: 'ks_dashboard_ninja.board',
                method: 'ks_fetch_item_controller',
                args: [],
                kwargs: {
                    'item_id': [item_data.id],
                    'dashboard': item_data.ks_dashboard_id,
                    'type': ks_self.data_selection,
                    'params': params,
                    context: ks_self.getContext(),
                },

            }).then(function(new_item_data) {
                this.config.ks_item_data[item_data.id] = new_item_data[item_data.id];
                this.ksUpdateDashboardItem([item_data.id]);
            }.bind(this));
        },

        onChartCanvasClick_funnel: function(evt,item_id,item) {
            var ks_self = this;
            if (item && item?.ks_dashboard_item_type !== 'ks_list_view') {
                if (item_id in ks_self.ksUpdateDashboard) {
                    clearInterval(ks_self.ksUpdateDashboard[item_id])
                    delete ks_self.ksUpdateDashboard[item_id];
                }
                var domain = [];
        var partner_id;
        var final_active;
        var index;
        var item_data = ks_self.config.ks_item_data[item_id];
        var groupBy = JSON.parse(item_data["ks_chart_data"])['groupby'];
        var labels = JSON.parse(item_data["ks_chart_data"])['labels'];
        var domains = JSON.parse(item_data["ks_chart_data"])['domains'];
        var sequnce = item_data.sequnce ? item_data.sequnce : 0;
//         $(".ks_dashboard_main_content").find(".grid-stack-item[gs-id=" + item_id + "]").find(".ks_breadcrumb").removeClass("d-none")
        var chart_title = '#'+item.name
//        if (item.ks_dashboard_item_type == "ks_bullet_chart" || item.ks_dashboard_item_type === "ks_funnel_chart" || item.ks_dashboard_item_type === "ks_flower_view" || item.ks_dashboard_item_type === "ks_radialBar_chart"){
        if (evt.target.dataItem){
            var activePoint = evt.target.dataItem.dataContext;
        }
//        }else{

//            var activePoint = evt.target.dataItem.dataContext;
//        }
        if (activePoint) {
            if (activePoint.category){
                for (let i=0 ; i<labels.length ; i++){
                    if (labels[i] == activePoint.category){
                        index = i
                    }
                }
                domain = domains[index]
            }
            else if (activePoint.stage){
                for (let i=0 ; i<labels.length ; i++){
                    if (labels[i] == activePoint.stage){
                        index = i
                    }
                }
                domain = domains[index]
            }

                        if (item_data.max_sequnce != 0 && sequnce < item_data.max_sequnce) {
                            jsonrpc('/fetch/drill_down/data',  {
                                model: 'ks_dashboard_ninja.item',
                                method: 'ks_fetch_drill_down_data_controller',
                                args: [],
                                kwargs: {
                                    'item_id': item_id,
                                    'domain': domain,
                                    'sequence': sequnce,
                                    'type': ks_self.data_selection,
                                }
                            }).then(function(result) {
                                ks_self.config.ks_item_data[item_id]['sequnce'] = result.sequence;
                                ks_self.config.ks_item_data[item_id]['isDrill'] = true;
                                if (result.ks_chart_data) {
                                    ks_self.config.ks_item_data[item_id]['ks_dashboard_item_type'] = result.ks_chart_type;
                                    ks_self.config.ks_item_data[item_id]['ks_chart_data'] = result.ks_chart_data;
                                    if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                    } else {
                                        ks_self.config.ks_item_data[item_id]['domains'] = {}
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                    }

                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    if(item_data.ks_dashboard_item_type == 'ks_funnel_chart'){
                                    $(".ks_dashboard_main_content").find(".grid-stack-item[gs-id=" + item_id + "]").find(".card-body").remove();
                                    ks_self.ksrenderfunnelchart($(".ks_dashboard_main_content").find(".grid-stack-item[gs-id=" + item_id + "]"),item_data);
                                    }else{
                                     $(".ks_dashboard_main_content").find(".grid-stack-item[gs-id=" + item_id + "]").find(".card-body").remove();
                                       ks_self.ks_render_graphs($(".ks_dashboard_main_content").find(".grid-stack-item[gs-id=" + item_id + "]"), item_data);
                                    }

                                } else {
                                    if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    } else {
                                        ks_self.config.ks_item_data[item_id]['domains'] = {}
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    }

                                    ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_data'] = result.ks_list_view_data;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_type'] = "grouped";
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    var $container = ks_self._renderListViewData(item_data);
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('ks_overflow');
                                }
                            });
                        }

                }
            } else {
                var item_id = $(evt.target).parent().data().itemId;
                if (ks_self.config.ks_item_data[item_id].max_sequnce) {
                    clearInterval(this.ksUpdateDashboard[item_id]);
                    delete ks_self.ksUpdateDashboard[item_id];
                    var sequence = $(evt.target).parent().data().sequence ? $(evt.target).parent().data().sequence : 0;

                    var domain = $(evt.target).parent().data().domain;

                    if ($(evt.target).parent().data().last_seq !== sequence) {
                        jsonrpc('/fetch/drill_down/data', {
                            model: 'ks_dashboard_ninja.item',
                            method: 'ks_fetch_drill_down_data_controller',
                            args: [],
                            kwargs: {
                                'item_id': item_id,
                                'domain': domain,
                                'sequence': sequence,
                                'type': ks_self.data_selection,
                            }
                        }).then(function(result) {
                            if (result.ks_list_view_data) {
                                if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                } else {
                                    ks_self.config.ks_item_data[item_id]['domains'] = {}
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                }
                                ks_self.config.ks_item_data[item_id]['isDrill'] = true;
                                ks_self.config.ks_item_data[item_id]['ks_list_view_data'] = result.ks_list_view_data;
                                ks_self.config.ks_item_data[item_id]['ks_list_view_type'] = "grouped";
                                ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_pager").addClass('d-none');

                                var item_data = ks_self.config.ks_item_data[item_id]
                                var $container = ks_self._renderListViewData(item_data);
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('ks_overflow');
                            } else {
                                ks_self.config.ks_item_data[item_id]['ks_chart_data'] = result.ks_chart_data;
                                ks_self.config.ks_item_data[item_id]['sequnce'] = result.sequence;
                                ks_self.config.ks_item_data[item_id]['ks_dashboard_item_type'] = result.ks_chart_type;
                                ks_self.config.ks_item_data[item_id]['isDrill'] = true;
                                if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                } else {
                                    ks_self.config.ks_item_data[item_id]['domains'] = {}
                                    ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_chart_data).previous_domain;
                                }
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").remove();
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_pager").addClass('d-none')
                                var item_data = ks_self.config.ks_item_data[item_id]
                                 if (item_data['ks_dashboard_item_type'] == 'ks_funnel_chart'){
//                                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                                    ks_self.ksrenderfunnelchart(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                                 }else if (item_data['ks_dashboard_item_type'] == 'ks_map_view'){
//                                    ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                                    ks_self.ksrendermapview(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                                 }else{
//                                     ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                                    ks_self.ks_render_graphs(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                                }

                            }
                        });
                    }
                }
            }
        },

        ksOnDrillUp: function(e) {
            var ks_self = this;
            var item_id = e.currentTarget.dataset.itemId;
            var item_data = ks_self.config.ks_item_data[item_id];
            if (item_data) {
                if ('domains' in item_data) {
                    if (item_data.sequnce) {
                        var domain = item_data['domains'] ? item_data['domains'][item_data.sequnce - 1] : [];
                        var sequnce = item_data.sequnce - 2;

                        if (sequnce >= 0) {
                            jsonrpc('/fetch/drill_down/data',  {
                                model: 'ks_dashboard_ninja.item',
                                method: 'ks_fetch_drill_down_data_controller',
                                args: [],
                                kwargs: {
                                    'item_id': item_id,
                                    'domain': domain,
                                    'sequence': sequnce,
                                    'type': ks_self.data_selection,
                                }
                            }).then(function(result) {
                                ks_self.config.ks_item_data[item_id]['ks_chart_data'] = result.ks_chart_data;
                                if (result.ks_list_view_type) {
                                    ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                } else {
                                    ks_self.config.ks_item_data[item_id]['sequnce'] = result.sequence;
                                }

                                ks_self.config.ks_item_data[item_id]['ks_dashboard_item_type'] = result.ks_chart_type;
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").remove();
                                if (result.ks_chart_data) {
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    if (item_data['ks_dashboard_item_type'] == 'ks_funnel_chart'){
//                                        ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                                        ks_self.ksrenderfunnelchart(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                                    }else if (item_data['ks_dashboard_item_type'] == 'ks_map_view'){
//                                        ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                                        ks_self.ksrendermapview(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                                    }else{
//                                        ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".card-body").remove();
                                        ks_self.ks_render_graphs(ks_self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]"),item_data);
                                    }

//                                    ks_self._renderChart($(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);
                                } else {
                                    if ('domains' in ks_self.config.ks_item_data[item_id]) {
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    } else {
                                        ks_self.config.ks_item_data[item_id]['domains'] = {}
                                        ks_self.config.ks_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.ks_list_view_data).previous_domain;
                                    }

                                    ks_self.config.ks_item_data[item_id]['sequnce'] = JSON.parse(result.ks_list_view_data).data_rows[0].sequence;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_data'] = result.ks_list_view_data;
                                    ks_self.config.ks_item_data[item_id]['ks_list_view_type'] = "grouped";
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").removeClass('d-none');
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = ks_self.config.ks_item_data[item_id]
                                    var $container = ks_self._renderListViewData(item_data);
                                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('ks_overflow');
                                }

                            });
                        } else {
                            $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").addClass('d-none');
                            ks_self.ksFetchUpdateItem(item_id);
                            var updateValue = ks_self.config.ks_item_data[item_id]["ks_update_items_data"];
                            if (updateValue) {
                                var updateinterval = setInterval(function() {
                                    ks_self.ksFetchUpdateItem(item_id)
                                }, updateValue);
                                ks_self.ksUpdateDashboard[item_id] = updateinterval;
                            }
                        }
                    } else {
                        $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").addClass('d-none');
                    }
                } else {
                    $(ks_self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".ks_dashboard_item_drill_up").addClass('d-none');
                    ks_self.ksFetchUpdateItem(item_id);
                    var updateValue = ks_self.config.ks_item_data[item_id]["ks_update_items_data"];
                    if (updateValue) {
                        var updateinterval = setInterval(function() {
                            ks_self.ksFetchUpdateItem(item_id)
                        }, updateValue);
                        ks_self.ksUpdateDashboard[item_id] = updateinterval;
                    }
                }
            }
        },

        ksLoadMoreRecords: function(e) {
            var self = this;
            var ks_intial_count = e.target.parentElement.dataset.prevOffset;
            var ks_offset = e.target.parentElement.dataset.next_offset;
            var dashboard_id = self.$target.attr('data-id');
            var itemId = e.currentTarget.dataset.itemId;
            var offset = self.config.ks_item_data[itemId].ks_pagination_limit;
            if (itemId in self.ksUpdateDashboard) {
                clearInterval(self.ksUpdateDashboard[itemId])
                delete self.ksUpdateDashboard[itemId];
            }
            var params = self.ksGetParamsForItemFetch(parseInt(itemId));
            jsonrpc('/next/offset', {
                model: 'ks_dashboard_ninja.item',
                method: 'ks_get_next_offset_controller',
                args: [],
                kwargs: {
                    'item_id': parseInt(itemId),
                    'offset': {
                        ks_intial_count: ks_intial_count,
                        offset: ks_offset
                    },
                    'dashboard_id': parseInt(dashboard_id),
                    'type': self.data_selection,
                    'params':params,
                    context: self.getContext(),
                },

            }).then(function(result) {
                var item_data = self.config.ks_item_data[itemId];
                self.config.ks_item_data[itemId]['ks_list_view_data'] = result.ks_list_view_data;
                var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                item_view.find('.card-body').empty();
                item_view.find('.card-body').append(self._renderListViewData(item_data));
                $(e.currentTarget).parents('.ks_pager').find('.ks_value').text(result.offset + "-" + result.next_offset);
                e.target.parentElement.dataset.next_offset = result.next_offset;
                e.target.parentElement.dataset.prevOffset = result.offset;
                $(e.currentTarget.parentElement).find('.ks_load_previous').removeClass('ks_event_offer_list');
                if (result.next_offset < parseInt(result.offset) + (offset - 1) || result.next_offset == item_data.ks_record_count || result.next_offset === result.limit){
                    $(e.currentTarget).addClass('ks_event_offer_list');
                }
            });
        },

        ksGetParamsForItemFetch: function(){
            return {};
        },

        ksLoadPreviousRecords: function(e) {
            var self = this;
            var itemId = e.currentTarget.dataset.itemId;
            var offset = self.config.ks_item_data[itemId].ks_pagination_limit;
            var ks_offset =  parseInt(e.target.parentElement.dataset.prevOffset) - (offset + 1) ;
            var ks_intial_count = e.target.parentElement.dataset.next_offset;

            var dashboard_id = self.$target.attr('data-id');
            var params = self.ksGetParamsForItemFetch(parseInt(itemId));
            if (ks_offset <= 0) {
                var updateValue = self.config.ks_item_data[itemId]["ks_update_items_data"];
                if (updateValue) {
                    var updateinterval = setInterval(function() {
                        self.ksFetchUpdateItem(itemId);
                    }, updateValue);
                    self.ksUpdateDashboard[itemId] = updateinterval;
                }
            }
            jsonrpc('/next/offset', {
                model: 'ks_dashboard_ninja.item',
                method: 'ks_get_next_offset_controller',
                args: [],
                kwargs: {
                    'item_id': parseInt(itemId),
                    'offset': {
                        ks_intial_count: ks_intial_count,
                        offset: ks_offset
                    },
                    'dashboard_id': parseInt(dashboard_id),
                    'type': self.data_selection,
                    'params':params,
                    context: self.getContext(),
                },

            }).then(function(result) {
                var item_data = self.config.ks_item_data[itemId];
                self.config.ks_item_data[itemId]['ks_list_view_data'] = result.ks_list_view_data;
                var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                item_view.find('.card-body').empty();
                item_view.find('.card-body').append(self._renderListViewData(item_data));
                $(e.currentTarget).parents('.ks_pager').find('.ks_value').text(result.offset + "-" + result.next_offset);
                e.target.parentElement.dataset.next_offset = result.next_offset;
                e.target.parentElement.dataset.prevOffset = result.offset;
                $(e.currentTarget.parentElement).find('.ks_load_next').removeClass('ks_event_offer_list');
                if (result.offset === 1) {
                    $(e.currentTarget).addClass('ks_event_offer_list');
                }
            });
        },

        ksRenderToDoDashboardView: function(item){
            var self = this;
            var item_title = item.name;
            var item_id = item.id;
            var list_to_do_data = JSON.parse(item.ks_to_do_data)
            var ks_header_color = self._ks_get_rgba_format(item.ks_header_bg_color);
            var ks_font_color = self._ks_get_rgba_format(item.ks_font_color);
            var ks_rgba_button_color = self._ks_get_rgba_format(item.ks_button_color);
            var $ksItemContainer = self.ksRenderToDoView(item);
            var $ks_gridstack_container = $(renderToElement('ks_website_dashboard_ninja.Ks_to_do_dashboard_container', {
                ks_chart_title: item_title,
                ksIsDashboardManager: self.config.ks_dashboard_manager,
                ks_dashboard_list: self.config.ks_dashboard_list,
                item_id: item_id,
                to_do_view_data: list_to_do_data,
            })).addClass('ks_dashboarditem_id')
            $ks_gridstack_container.find('.ks_card_header').addClass('ks_bg_to_color').css({"background-color": ks_header_color });
            $ks_gridstack_container.find('.ks_card_header').addClass('ks_bg_to_color').css({"color": ks_font_color + ' !important' });
            $ks_gridstack_container.find('.ks_li_tab').addClass('ks_bg_to_color').css({"color": ks_font_color + ' !important' });
            $ks_gridstack_container.find('.ks_list_view_heading').addClass('ks_bg_to_color').css({"color": ks_font_color + ' !important' });
            $ks_gridstack_container.find('.ks_to_do_card_body').append($ksItemContainer);
            $ks_gridstack_container.find('.header_add_btn').addClass('d-none');

            return [$ks_gridstack_container, $ksItemContainer];
        },

        ksRenderToDoView: function(item, ks_tv_play=true) {
            var self = this;
            var  item_id = item.id;
            var list_to_do_data = JSON.parse(item.ks_to_do_data);
            var $todoViewContainer = $(renderToElement('ks_website_dashboard_ninja.Ks_to_do_dashboard_inner_container', {
                ks_to_do_view_name: "Test",
                to_do_view_data: list_to_do_data,
                item_id: item_id,
                ks_tv_play: ks_tv_play
            }));

            return $todoViewContainer
        },

    });

    publicWidget.registry.snippet_dashboard_home_page = snippet_dashboard_home_page
    export default snippet_dashboard_home_page;
