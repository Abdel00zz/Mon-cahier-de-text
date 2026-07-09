sed -i -e '/<Select/!b' -e '/<Select/,/<\/Select>/c\
                <Select\
                  value={formData.type}\
                  onValueChange={(value) => setFormData({ ...formData, type: value })}\
                  required\
                >\
                  <SelectTrigger id="itemType" ref={selectFocusRef as any} className="rounded-xl border-slate-200 h-11 shadow-none">\
                    <SelectValue placeholder="Choisir..." />\
                  </SelectTrigger>\
                  <SelectContent>\
                    {UNIQUE_LESSON_ITEM_TYPES.map(type => (\
                      <SelectItem key={type} value={type}>\
                        {type.charAt(0).toUpperCase() + type.slice(1)}\
                      </SelectItem>\
                    ))}\
                  </SelectContent>\
                </Select>' components/modals/EditItemModal.tsx
